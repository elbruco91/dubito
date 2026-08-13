/* ============================================================
   DUBITO — motore di gioco
   Stati del turno:
   draw -> caller-declare -> others-declare -> caller-action
   -> (challenge-response -> caller-action)*  -> final-guess?
   -> resolve -> reveal -> (next turn | game-over)
   ============================================================ */

const TEAM_COLORS = ["t-amber", "t-teal", "t-magenta", "t-indigo", "t-coral", "t-sage"];

let state = null;

function initState(cardPool, teamNames, cardsPerTeam) {
  const totalNeeded = teamNames.length * cardsPerTeam;
  const cards = shuffle(cardPool).slice(0, totalNeeded).map((c, i) => ({ ...c, id: i }));

  const teams = teamNames.map((name, i) => ({
    id: i,
    name: name || `Team ${i + 1}`,
    color: TEAM_COLORS[i % TEAM_COLORS.length],
    score: 0,
    hand: cards.slice(i * cardsPerTeam, (i + 1) * cardsPerTeam),
  }));

  return {
    teams,
    activeTeamId: 0,
    round: 1,
    phase: "draw",
    currentCard: null,
    callerKnows: null,
    declarations: {},
    resolvedTeams: [],
    log: [],
    gameOver: false,
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function activeTeam() { return state.teams[state.activeTeamId]; }
function teamById(id) { return state.teams.find((t) => t.id === id); }

function nextTeamWithCards(fromId) {
  for (let step = 1; step <= state.teams.length; step++) {
    const idx = (fromId + step) % state.teams.length;
    if (state.teams[idx].hand.length > 0) return idx;
  }
  return null;
}

function addLog(text) {
  state.log.unshift(text);
  if (state.log.length > 40) state.log.pop();
}

/* ---------- correzione manuale punteggi (sempre disponibile) ---------- */

function adjustScore(teamId, delta) {
  teamById(teamId).score += delta;
  addLog(`Correzione manuale: ${teamById(teamId).name} ${delta > 0 ? "+" : ""}${delta} punto/i.`);
  render();
}

function promptExactScore(teamId) {
  const team = teamById(teamId);
  const input = window.prompt(`Nuovo punteggio per ${team.name}:`, team.score);
  if (input === null) return;
  const value = parseInt(input, 10);
  if (Number.isNaN(value)) return;
  addLog(`Correzione manuale: ${team.name} portato a ${value} punti (era ${team.score}).`);
  team.score = value;
  render();
}

/* ---------- azioni di gioco ---------- */

function pickCard(cardId) {
  const team = activeTeam();
  const idx = team.hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return;
  state.currentCard = team.hand[idx];
  team.hand.splice(idx, 1);
  state.phase = "caller-declare";
  addLog(`${team.name} rivela la carta "${state.currentCard.term}".`);
  render();
}

function callerDeclare(knows) {
  state.callerKnows = knows;
  state.declarations[state.activeTeamId] = knows ? "know" : "dont";
  addLog(`${activeTeam().name} dichiara di ${knows ? "conoscere" : "non conoscere"} il concetto.`);
  state.phase = "others-declare";
  state._othersQueue = state.teams.map((t) => t.id).filter((id) => id !== state.activeTeamId);
  render();
}

function otherDeclare(teamId, knows) {
  state.declarations[teamId] = knows ? "know" : "dont";
  addLog(`${teamById(teamId).name} dichiara di ${knows ? "conoscere" : "non conoscere"} il concetto.`);
  state._othersQueue = state._othersQueue.filter((id) => id !== teamId);
  if (state._othersQueue.length === 0) startCallerAction();
  render();
}

function startCallerAction() {
  const claimants = availableDoubtTargets();
  if (claimants.length === 0 && !state.callerKnows) {
    addLog(`Nessun team conosce il concetto. Turno chiuso senza punti.`);
    grantUnchallengedBonus();
    state.phase = "reveal";
    return;
  }
  state.phase = "caller-action";
}

function availableDoubtTargets() {
  return Object.entries(state.declarations)
    .filter(([id, v]) => v === "know" && Number(id) !== state.activeTeamId)
    .map(([id]) => Number(id))
    .filter((id) => !state.resolvedTeams.includes(id));
}

function callerStatesAnswer() { state.phase = "judge-caller-answer"; render(); }

function judgeCallerAnswer(correct) {
  const team = activeTeam();
  team.score += correct ? 2 : -2;
  addLog(`${team.name} risponde ${correct ? "correttamente: +2 punti." : "in modo errato: -2 punti."}`);
  state.resolvedTeams.push(state.activeTeamId);
  endTurnResolution();
}

function callerFinalGuess() { state.phase = "judge-final-guess"; render(); }

function judgeFinalGuess(correct) {
  const team = activeTeam();
  team.score += correct ? 2 : -2;
  addLog(`${team.name} tenta l'ultima risposta: ${correct ? "corretta, +2 punti." : "sbagliata, -2 punti."}`);
  endTurnResolution();
}

function doubtTeam(teamId) {
  state.doubtedTeamId = teamId;
  state.phase = "challenge-response";
  addLog(`${activeTeam().name} dubita di ${teamById(teamId).name}.`);
  render();
}

function challengeDecline() {
  const team = teamById(state.doubtedTeamId);
  team.score -= 1;
  addLog(`${team.name} ammette di non sapere: -1 punto.`);
  state.resolvedTeams.push(state.doubtedTeamId);
  state.doubtedTeamId = null;
  afterChallengeFailure();
}

function challengeAttempt() { state.phase = "judge-challenge-attempt"; render(); }

function judgeChallengeAttempt(correct) {
  const team = teamById(state.doubtedTeamId);
  if (correct) {
    team.score += 1;
    addLog(`${team.name} risponde correttamente alla sfida: +1 punto. Turno chiuso.`);
    state.resolvedTeams.push(state.doubtedTeamId);
    state.doubtedTeamId = null;
    endTurnResolution();
  } else {
    team.score -= 2;
    addLog(`${team.name} tenta e sbaglia: -2 punti.`);
    state.resolvedTeams.push(state.doubtedTeamId);
    state.doubtedTeamId = null;
    afterChallengeFailure();
  }
}

function afterChallengeFailure() {
  const canStateOwn = state.callerKnows && !state.resolvedTeams.includes(state.activeTeamId);
  const targets = availableDoubtTargets();
  state.phase = (canStateOwn || targets.length > 0) ? "caller-action" : "final-guess-prompt";
  render();
}

function grantUnchallengedBonus() {
  Object.entries(state.declarations).forEach(([id, v]) => {
    const teamId = Number(id);
    if (v === "know" && !state.resolvedTeams.includes(teamId)) {
      teamById(teamId).score += 1;
      addLog(`${teamById(teamId).name} aveva dichiarato di sapere e non è stato chiamato: +1 punto.`);
    }
  });
}

function endTurnResolution() {
  grantUnchallengedBonus();
  state.phase = "reveal";
  render();
}

function revealDefinitionAndContinue() {
  const next = nextTeamWithCards(state.activeTeamId);
  state.currentCard = null;
  state.callerKnows = null;
  state.declarations = {};
  state.resolvedTeams = [];
  state.doubtedTeamId = null;
  state._othersQueue = [];

  if (next === null) {
    state.gameOver = true;
    addLog("Tutte le carte sono state giocate. Partita conclusa.");
  } else {
    state.activeTeamId = next;
    state.round += 1;
    state.phase = "draw";
  }
  render();
}

/* ---------- rendering ---------- */

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  children.flat().forEach((c) => {
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  });
  return e;
}

function render() {
  const root = document.getElementById("app");
  root.innerHTML = "";
  root.appendChild(renderScoreboard());
  root.appendChild(renderMain());
  root.appendChild(renderLog());
}

function renderScoreboard() {
  const wrap = el("div", { class: "scoreboard" });
  state.teams.forEach((t) => {
    const isActive = t.id === state.activeTeamId && !state.gameOver;
    wrap.appendChild(
      el(
        "div",
        { class: `team-chip ${t.color} ${isActive ? "active" : ""}` },
        el("span", { class: "team-name" }, t.name),
        el(
          "div",
          { class: "score-row" },
          el("button", { class: "score-btn", onclick: () => adjustScore(t.id, -1), title: "Correggi -1" }, "−"),
          el("span", { class: "team-score", onclick: () => promptExactScore(t.id), title: "Tocca per correggere" }, String(t.score)),
          el("button", { class: "score-btn", onclick: () => adjustScore(t.id, 1), title: "Correggi +1" }, "+")
        ),
        el("span", { class: "team-cards" }, `${t.hand.length} carte`)
      )
    );
  });
  return wrap;
}

function renderLog() {
  const wrap = el("div", { class: "log" }, el("h3", {}, "Cronologia"));
  const list = el("ul", {});
  state.log.forEach((line) => list.appendChild(el("li", {}, line)));
  wrap.appendChild(list);
  return wrap;
}

function renderMain() {
  if (state.gameOver) return renderGameOver();
  const wrap = el("div", { class: "main-panel" });
  const team = activeTeam();
  wrap.appendChild(el("div", { class: "turn-banner" }, `Turno di `, el("strong", {}, team.name)));

  switch (state.phase) {
    case "draw": wrap.appendChild(renderDraw(team)); break;
    case "caller-declare": wrap.appendChild(renderCallerDeclare(team)); break;
    case "others-declare": wrap.appendChild(renderOthersDeclare()); break;
    case "caller-action": wrap.appendChild(renderCallerAction(team)); break;
    case "judge-caller-answer": wrap.appendChild(renderJudge(`${team.name} ha risposto. Corretto?`, judgeCallerAnswer)); break;
    case "challenge-response": wrap.appendChild(renderChallengeResponse()); break;
    case "judge-challenge-attempt": wrap.appendChild(renderJudge(`${teamById(state.doubtedTeamId).name} ha risposto. Corretto?`, judgeChallengeAttempt)); break;
    case "final-guess-prompt": wrap.appendChild(renderFinalGuessPrompt(team)); break;
    case "judge-final-guess": wrap.appendChild(renderJudge(`${team.name} tenta l'ultima risposta. Corretto?`, judgeFinalGuess)); break;
    case "reveal": wrap.appendChild(renderReveal()); break;
  }
  return wrap;
}

function renderDraw(team) {
  const wrap = el("div", { class: "card-picker" });
  wrap.appendChild(el("p", { class: "instructions" }, `${team.name}, scegli una carta da rivelare.`));
  const grid = el("div", { class: "hand-grid" });
  team.hand.forEach((c) => grid.appendChild(el("button", { class: "card-back", onclick: () => pickCard(c.id) }, "?")));
  wrap.appendChild(grid);
  return wrap;
}

function renderCallerDeclare(team) {
  return el(
    "div", { class: "declare-box" },
    el("div", { class: "revealed-card" }, state.currentCard.term),
    el("p", { class: "instructions" }, `${team.name}, dichiari di conoscere questo concetto?`),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-know", onclick: () => callerDeclare(true) }, "La conosco"),
      el("button", { class: "btn btn-dont", onclick: () => callerDeclare(false) }, "Non la conosco")
    )
  );
}

function renderOthersDeclare() {
  const teamId = state._othersQueue[0];
  const t = teamById(teamId);
  return el(
    "div", { class: "declare-box" },
    el("div", { class: "revealed-card" }, state.currentCard.term),
    el("p", { class: "instructions" }, `${t.name}, conoscete questo concetto?`),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-know", onclick: () => otherDeclare(teamId, true) }, "La conosco"),
      el("button", { class: "btn btn-dont", onclick: () => otherDeclare(teamId, false) }, "Non la conosco")
    )
  );
}

function renderCallerAction(team) {
  const wrap = el("div", { class: "declare-box" });
  wrap.appendChild(el("div", { class: "revealed-card" }, state.currentCard.term));
  wrap.appendChild(el("p", { class: "instructions" }, `${team.name}, cosa fate?`));
  const row = el("div", { class: "btn-row wrap" });
  if (state.callerKnows && !state.resolvedTeams.includes(state.activeTeamId)) {
    row.appendChild(el("button", { class: "btn btn-know", onclick: callerStatesAnswer }, "Enuncia la risposta"));
  }
  availableDoubtTargets().forEach((id) => {
    const t = teamById(id);
    row.appendChild(el("button", { class: `btn btn-doubt`, onclick: () => doubtTeam(id) }, `Dubita ${t.name}`));
  });
  wrap.appendChild(row);
  return wrap;
}

function renderChallengeResponse() {
  const t = teamById(state.doubtedTeamId);
  return el(
    "div", { class: "declare-box" },
    el("div", { class: "revealed-card" }, state.currentCard.term),
    el("p", { class: "instructions" }, `${t.name} è stato dubitato. Tentate la risposta o ammettete?`),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-know", onclick: challengeAttempt }, "Tento la risposta (rischio -2)"),
      el("button", { class: "btn btn-dont", onclick: challengeDecline }, "Non la so (-1 sicuro)")
    )
  );
}

function renderFinalGuessPrompt(team) {
  return el(
    "div", { class: "declare-box" },
    el("div", { class: "revealed-card" }, state.currentCard.term),
    el("p", { class: "instructions" }, `Nessun team ha indovinato. ${team.name} può tentare un'ultima risposta.`),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-know", onclick: callerFinalGuess }, "Tenta l'ultima risposta"),
      el("button", { class: "btn btn-dont", onclick: () => { endTurnResolution(); } }, "Passa (nessun punto)")
    )
  );
}

function renderJudge(question, callback) {
  return el(
    "div", { class: "declare-box" },
    el("div", { class: "revealed-card" }, state.currentCard.term),
    el("p", { class: "instructions" }, question),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-correct", onclick: () => callback(true) }, "Corretto"),
      el("button", { class: "btn btn-wrong", onclick: () => callback(false) }, "Sbagliato")
    )
  );
}

function renderReveal() {
  return el(
    "div", { class: "declare-box" },
    el("div", { class: "revealed-card" }, state.currentCard.term),
    el("div", { class: "definition" }, state.currentCard.definition || "(nessuna definizione fornita nel CSV)"),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-know", onclick: revealDefinitionAndContinue }, "Prossimo turno")
    )
  );
}

function renderGameOver() {
  const sorted = [...state.teams].sort((a, b) => b.score - a.score);
  const wrap = el("div", { class: "main-panel game-over" });
  wrap.appendChild(el("h2", {}, "Partita conclusa"));
  const list = el("ol", { class: "final-ranking" });
  sorted.forEach((t) => list.appendChild(el("li", { class: t.color }, `${t.name} — ${t.score} punti`)));
  wrap.appendChild(list);
  wrap.appendChild(el("button", { class: "btn btn-know", onclick: () => showSetup() }, "Nuova partita"));
  return wrap;
}

/* ---------- CSV ---------- */

function parseCSV(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;
  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += char;
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ",") { row.push(field); field = ""; }
      else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((c) => c.trim() !== "")) rows.push(row);
        row = [];
      } else field += char;
    }
    i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); if (row.some((c) => c.trim() !== "")) rows.push(row); }
  return rows;
}

function csvToCards(text) {
  const rows = parseCSV(text);
  let dataRows = rows;
  if (rows.length > 0) {
    const firstCell = (rows[0][0] || "").trim().toLowerCase();
    if (["term", "concetto", "parola", "termine"].includes(firstCell)) dataRows = rows.slice(1);
  }
  return dataRows.map((r) => ({ term: (r[0] || "").trim(), definition: (r[1] || "").trim() })).filter((c) => c.term);
}

function downloadSampleCSV() {
  const header = "term,definition\n";
  const body = DECKS.cybersecurity.cards.map((c) => `"${c.term}","${c.definition.replace(/"/g, '""')}"`).join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "esempio-mazzo.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- setup screen ---------- */

function showSetup() {
  const root = document.getElementById("app");
  root.innerHTML = "";

  let uploadedCards = null;
  let nameInputs = [];

  const wrap = el("div", { class: "setup-panel" });
  wrap.appendChild(el("h1", {}, "Dubito: Concetti"));
  wrap.appendChild(el("p", { class: "subtitle" }, "Un gioco di bluff sui concetti visti in classe."));

  // numero team / carte per team
  const numsRow = el("div", { class: "nums-row" });
  const teamCountInput = el("input", { type: "number", min: "2", max: "6", value: "4" });
  const cardsPerTeamInput = el("input", { type: "number", min: "2", max: "8", value: "4" });
  numsRow.appendChild(el("div", { class: "name-field" }, el("label", {}, "Numero di team"), teamCountInput));
  numsRow.appendChild(el("div", { class: "name-field" }, el("label", {}, "Carte per team"), cardsPerTeamInput));
  wrap.appendChild(numsRow);

  // sorgente mazzo
  wrap.appendChild(el("label", {}, "Mazzo di concetti"));
  const deckSelect = el("select", {});
  deckSelect.appendChild(el("option", { value: "builtin:cybersecurity" }, "Cybersecurity (integrato)"));
  deckSelect.appendChild(el("option", { value: "csv" }, "Carica un CSV personalizzato"));
  wrap.appendChild(deckSelect);

  const csvBlock = el("div", { class: "csv-block", style: "display:none" });
  const csvInput = el("input", { type: "file", accept: ".csv" });
  const csvStatus = el("p", { class: "csv-status" }, "");
  csvInput.addEventListener("change", () => {
    const file = csvInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      uploadedCards = csvToCards(String(reader.result));
      csvStatus.textContent = `${uploadedCards.length} concetti caricati da "${file.name}".`;
    };
    reader.readAsText(file, "UTF-8");
  });
  const sampleLink = el("a", { href: "#", class: "sample-link", onclick: (e) => { e.preventDefault(); downloadSampleCSV(); } }, "Scarica un CSV di esempio");
  csvBlock.appendChild(el("p", { class: "csv-hint" }, "Colonne: term, definition (prima riga facoltativa come intestazione)."));
  csvBlock.appendChild(csvInput);
  csvBlock.appendChild(csvStatus);
  csvBlock.appendChild(sampleLink);
  wrap.appendChild(csvBlock);

  deckSelect.addEventListener("change", () => {
    csvBlock.style.display = deckSelect.value === "csv" ? "block" : "none";
  });

  // nomi team (dinamici in base al numero di team)
  const namesWrap = el("div", { class: "names-grid" });
  wrap.appendChild(namesWrap);

  function renderNameFields(count) {
    namesWrap.innerHTML = "";
    nameInputs = [];
    for (let i = 0; i < count; i++) {
      const input = el("input", { type: "text", placeholder: `Team ${i + 1}` });
      nameInputs.push(input);
      namesWrap.appendChild(el("div", { class: "name-field" }, el("label", {}, `Team ${i + 1}`), input));
    }
  }
  renderNameFields(4);
  teamCountInput.addEventListener("change", () => {
    let n = parseInt(teamCountInput.value, 10);
    if (Number.isNaN(n)) n = 4;
    n = Math.max(2, Math.min(6, n));
    teamCountInput.value = n;
    renderNameFields(n);
  });

  const errorBox = el("p", { class: "error-box" }, "");
  wrap.appendChild(errorBox);

  wrap.appendChild(
    el("button", {
      class: "btn btn-know start-btn",
      onclick: () => {
        const teamCount = Math.max(2, Math.min(6, parseInt(teamCountInput.value, 10) || 4));
        const cardsPerTeam = Math.max(2, Math.min(8, parseInt(cardsPerTeamInput.value, 10) || 4));
        const needed = teamCount * cardsPerTeam;

        let pool;
        if (deckSelect.value === "csv") {
          if (!uploadedCards || uploadedCards.length === 0) {
            errorBox.textContent = "Carica prima un CSV valido.";
            return;
          }
          pool = uploadedCards;
        } else {
          pool = DECKS.cybersecurity.cards;
        }

        if (pool.length < needed) {
          errorBox.textContent = `Servono almeno ${needed} concetti (${teamCount} team × ${cardsPerTeam} carte), il mazzo scelto ne ha solo ${pool.length}.`;
          return;
        }
        errorBox.textContent = "";

        const teamNames = nameInputs.map((inp, i) => inp.value.trim() || `Team ${i + 1}`);
        state = initState(pool, teamNames, cardsPerTeam);
        render();
      },
    }, "Inizia partita")
  );

  root.appendChild(wrap);
}

document.addEventListener("DOMContentLoaded", showSetup);
