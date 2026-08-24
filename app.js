/* ============================================================
   DUBITO — motore di gioco
   Stati del turno:
   draw -> caller-declare -> others-declare -> caller-action
   -> (challenge-response -> caller-action)*  -> final-guess?
   -> resolve -> reveal -> (next turn | game-over)
   ============================================================ */

const TEAM_COLORS = ["t-amber", "t-teal", "t-magenta", "t-indigo", "t-coral", "t-sage"];

let state = null;
let historyStack = [];
let redoStack = [];

/* ---------- mazzo integrato modificabile (persistito nel browser) ---------- */

const ORIGINAL_DECKS = JSON.parse(JSON.stringify(DECKS));
const CUSTOM_DECK_KEY = "dubito_custom_cybersecurity";
const EDITOR_PASSWORD = "Maur0!";

function loadCustomDeckFromStorage() {
  try {
    const raw = localStorage.getItem(CUSTOM_DECK_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === ORIGINAL_DECKS.cybersecurity.cards.length) {
      DECKS.cybersecurity.cards = parsed;
    }
  } catch (e) { /* localStorage non disponibile o dati corrotti: si tiene il mazzo originale */ }
}
loadCustomDeckFromStorage();

function saveCustomDeck(cards) {
  DECKS.cybersecurity.cards = cards;
  try { localStorage.setItem(CUSTOM_DECK_KEY, JSON.stringify(cards)); } catch (e) { /* ignora */ }
}

function resetCustomDeck() {
  DECKS.cybersecurity.cards = JSON.parse(JSON.stringify(ORIGINAL_DECKS.cybersecurity.cards));
  try { localStorage.removeItem(CUSTOM_DECK_KEY); } catch (e) { /* ignora */ }
}

/* ---------- cronologia / annulla-ripeti ---------- */

function pushHistory() {
  if (!state) return;
  historyStack.push(JSON.stringify(state));
  if (historyStack.length > 60) historyStack.shift();
  redoStack = [];
}

function undo() {
  if (historyStack.length === 0) return;
  redoStack.push(JSON.stringify(state));
  state = JSON.parse(historyStack.pop());
  render();
}

function redo() {
  if (redoStack.length === 0) return;
  historyStack.push(JSON.stringify(state));
  state = JSON.parse(redoStack.pop());
  render();
}

/* ---------- costruzione partita ---------- */

function numberPool(pool) {
  return pool.map((c, i) => ({ term: c.term, definition: c.definition, id: i + 1 }));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function baseState(teams) {
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
    paused: false,
  };
}

function buildTeams(teamNames, hands) {
  return teamNames.map((name, i) => ({
    id: i,
    name: name || `Team ${i + 1}`,
    color: TEAM_COLORS[i % TEAM_COLORS.length],
    score: 0,
    hand: hands[i],
  }));
}

function initStateAuto(numberedPool, teamNames, cardsPerTeam) {
  const totalNeeded = teamNames.length * cardsPerTeam;
  const dealt = shuffle(numberedPool).slice(0, totalNeeded);
  const hands = teamNames.map((_, i) => dealt.slice(i * cardsPerTeam, (i + 1) * cardsPerTeam));
  return baseState(buildTeams(teamNames, hands));
}

function initStateManual(numberedPool, teamNames, assignments) {
  const hands = assignments.map((numbers) => numbers.map((n) => numberedPool[n - 1]));
  return baseState(buildTeams(teamNames, hands));
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
  pushHistory();
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
  pushHistory();
  addLog(`Correzione manuale: ${team.name} portato a ${value} punti (era ${team.score}).`);
  team.score = value;
  render();
}

/* ---------- pausa / fine / menu ---------- */

function togglePause() {
  state.paused = !state.paused;
  render();
}

function endGameNow() {
  if (!window.confirm("Terminare la partita adesso? Il punteggio attuale sarà definitivo.")) return;
  pushHistory();
  state.gameOver = true;
  addLog("Partita terminata manualmente.");
  render();
}

function goToMenu() {
  if (!window.confirm("Tornare al menu? La partita in corso andrà persa.")) return;
  state = null;
  historyStack = [];
  redoStack = [];
  showSetup();
}

/* ---------- azioni di gioco ---------- */

function pickCard(cardId) {
  pushHistory();
  const team = activeTeam();
  const idx = team.hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return;
  state.currentCard = team.hand[idx];
  team.hand.splice(idx, 1);
  state.phase = "caller-declare";
  addLog(`${team.name} rivela la carta #${state.currentCard.id} ("${state.currentCard.term}").`);
  render();
}

function callerDeclare(knows) {
  pushHistory();
  state.callerKnows = knows;
  state.declarations[state.activeTeamId] = knows ? "know" : "dont";
  addLog(`${activeTeam().name} dichiara di ${knows ? "conoscere" : "non conoscere"} il concetto.`);
  state.phase = "others-declare";
  state._othersQueue = state.teams.map((t) => t.id).filter((id) => id !== state.activeTeamId);
  render();
}

function otherDeclare(teamId, knows) {
  pushHistory();
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

function callerStatesAnswer() { pushHistory(); state.phase = "judge-caller-answer"; render(); }

function judgeCallerAnswer(correct) {
  pushHistory();
  const team = activeTeam();
  team.score += correct ? 2 : -2;
  addLog(`${team.name} risponde ${correct ? "correttamente: +2 punti." : "in modo errato: -2 punti."}`);
  state.resolvedTeams.push(state.activeTeamId);
  endTurnResolution();
}

function callerFinalGuess() { pushHistory(); state.phase = "judge-final-guess"; render(); }

function judgeFinalGuess(correct) {
  pushHistory();
  const team = activeTeam();
  team.score += correct ? 2 : -2;
  addLog(`${team.name} tenta l'ultima risposta: ${correct ? "corretta, +2 punti." : "sbagliata, -2 punti."}`);
  endTurnResolution();
}

function doubtTeam(teamId) {
  pushHistory();
  state.doubtedTeamId = teamId;
  state.phase = "challenge-response";
  addLog(`${activeTeam().name} dubita di ${teamById(teamId).name}.`);
  render();
}

function challengeDecline() {
  pushHistory();
  const team = teamById(state.doubtedTeamId);
  team.score -= 1;
  addLog(`${team.name} ammette di non sapere: -1 punto.`);
  state.resolvedTeams.push(state.doubtedTeamId);
  state.doubtedTeamId = null;
  afterChallengeFailure();
}

function challengeAttempt() { pushHistory(); state.phase = "judge-challenge-attempt"; render(); }

function judgeChallengeAttempt(correct) {
  pushHistory();
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

function passFinalGuess() { pushHistory(); endTurnResolution(); }

function revealDefinitionAndContinue() {
  pushHistory();
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
  root.appendChild(renderTopBar());
  root.appendChild(renderScoreboard());
  root.appendChild(renderMain());
  root.appendChild(renderLog());
}

function renderTopBar() {
  const bar = el("div", { class: "top-bar" });
  bar.appendChild(el("button", { class: "icon-btn", onclick: undo }, "↶ Annulla"));
  bar.appendChild(el("button", { class: "icon-btn", onclick: redo }, "↷ Ripeti"));
  if (!state.gameOver) {
    bar.appendChild(el("button", { class: "icon-btn", onclick: togglePause }, state.paused ? "▶ Riprendi" : "⏸ Pausa"));
    bar.appendChild(el("button", { class: "icon-btn danger", onclick: endGameNow }, "⏹ Termina"));
  }
  bar.appendChild(el("button", { class: "icon-btn", onclick: goToMenu }, "🏠 Menu"));
  return bar;
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

function renderPausedScreen() {
  return el(
    "div", { class: "main-panel paused" },
    el("h2", {}, "Partita in pausa"),
    el("p", { class: "instructions" }, "Il contenuto della carta è nascosto. Premi Riprendi per continuare."),
    el("button", { class: "btn btn-know", onclick: togglePause }, "▶ Riprendi partita")
  );
}

function renderMain() {
  if (state.gameOver) return renderGameOver();
  if (state.paused) return renderPausedScreen();

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
  wrap.appendChild(el("p", { class: "instructions" }, `${team.name}, scegli quale carta fisica giocare.`));
  const grid = el("div", { class: "hand-grid" });
  team.hand.forEach((c) => grid.appendChild(el("button", { class: "card-back", onclick: () => pickCard(c.id) }, `#${c.id}`)));
  wrap.appendChild(grid);
  return wrap;
}

function renderCallerDeclare(team) {
  return el(
    "div", { class: "declare-box" },
    el("div", { class: "revealed-card" }, `#${state.currentCard.id} — ${state.currentCard.term}`),
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
    el("div", { class: "revealed-card" }, `#${state.currentCard.id} — ${state.currentCard.term}`),
    el("p", { class: "instructions" }, `${t.name}, conoscete questo concetto?`),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-know", onclick: () => otherDeclare(teamId, true) }, "La conosco"),
      el("button", { class: "btn btn-dont", onclick: () => otherDeclare(teamId, false) }, "Non la conosco")
    )
  );
}

function renderCallerAction(team) {
  const wrap = el("div", { class: "declare-box" });
  wrap.appendChild(el("div", { class: "revealed-card" }, `#${state.currentCard.id} — ${state.currentCard.term}`));
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
    el("div", { class: "revealed-card" }, `#${state.currentCard.id} — ${state.currentCard.term}`),
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
    el("div", { class: "revealed-card" }, `#${state.currentCard.id} — ${state.currentCard.term}`),
    el("p", { class: "instructions" }, `Nessun team ha indovinato. ${team.name} può tentare un'ultima risposta.`),
    el("div", { class: "btn-row" },
      el("button", { class: "btn btn-know", onclick: callerFinalGuess }, "Tenta l'ultima risposta"),
      el("button", { class: "btn btn-dont", onclick: passFinalGuess }, "Passa (nessun punto)")
    )
  );
}

function renderJudge(question, callback) {
  return el(
    "div", { class: "declare-box" },
    el("div", { class: "revealed-card" }, `#${state.currentCard.id} — ${state.currentCard.term}`),
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
    el("div", { class: "revealed-card" }, `#${state.currentCard.id} — ${state.currentCard.term}`),
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

/* ---------- stampa carte fisiche ---------- */

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function printDeck(numberedPool) {
  const existing = document.getElementById("print-sheet");
  if (existing) existing.remove();

  const sheet = document.createElement("div");
  sheet.id = "print-sheet";

  const numbersSection = document.createElement("div");
  numbersSection.className = "print-section";
  numbersSection.innerHTML = "<h2>Lato pubblico (da ritagliare)</h2>";
  const numbersGrid = document.createElement("div");
  numbersGrid.className = "print-grid";
  numberedPool.forEach((c) => {
    const card = document.createElement("div");
    card.className = "print-card";
    card.innerHTML = `<div class="print-card-number">#${c.id}</div>`;
    numbersGrid.appendChild(card);
  });
  numbersSection.appendChild(numbersGrid);

  const refSection = document.createElement("div");
  refSection.className = "print-section";
  refSection.innerHTML = "<h2>Riferimento numero → concetto (per te / per scrivere le carte)</h2>";
  const refList = document.createElement("table");
  refList.className = "print-ref-table";
  numberedPool.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>#${c.id}</td><td>${escapeHtml(c.term)}</td>`;
    refList.appendChild(tr);
  });
  refSection.appendChild(refList);

  sheet.appendChild(numbersSection);
  sheet.appendChild(refSection);
  document.body.appendChild(sheet);
  window.print();
}

/* ---------- setup screen ---------- */

function showSetup() {
  const root = document.getElementById("app");
  root.innerHTML = "";

  let uploadedCards = null;
  let nameInputs = [];
  let assignInputs = [];

  const wrap = el("div", { class: "setup-panel" });
  wrap.appendChild(el("h1", {}, "Dubito: Concetti"));
  wrap.appendChild(el("p", { class: "subtitle" }, "Un gioco di bluff sui concetti visti in classe."));

  const numsRow = el("div", { class: "nums-row" });
  const teamCountInput = el("input", { type: "number", min: "2", max: "6", value: "4" });
  const cardsPerTeamInput = el("input", { type: "number", min: "2", max: "8", value: "4" });
  numsRow.appendChild(el("div", { class: "name-field" }, el("label", {}, "Numero di team"), teamCountInput));
  numsRow.appendChild(el("div", { class: "name-field" }, el("label", {}, "Carte per team"), cardsPerTeamInput));
  wrap.appendChild(numsRow);

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
      refreshReferenceTable();
    };
    reader.readAsText(file, "UTF-8");
  });
  const sampleLink = el("a", { href: "#", class: "sample-link", onclick: (e) => { e.preventDefault(); downloadSampleCSV(); } }, "Scarica un CSV di esempio");
  csvBlock.appendChild(el("p", { class: "csv-hint" }, "Colonne: term, definition (prima riga facoltativa come intestazione)."));
  csvBlock.appendChild(csvInput);
  csvBlock.appendChild(csvStatus);
  csvBlock.appendChild(sampleLink);
  wrap.appendChild(csvBlock);

  function getSelectedPool() {
    if (deckSelect.value === "csv") {
      if (!uploadedCards || uploadedCards.length === 0) return null;
      return uploadedCards;
    }
    return DECKS.cybersecurity.cards;
  }

  function updateSourceVisibility() {
    const isCsv = deckSelect.value === "csv";
    csvBlock.style.display = isCsv ? "block" : "none";
    editBtn.style.display = isCsv ? "none" : "inline-block";
    if (isCsv) editorPanel.style.display = "none";
    refreshReferenceTable();
  }

  deckSelect.addEventListener("change", updateSourceVisibility);

  // editor del mazzo integrato
  const editBtn = el("button", { class: "btn btn-dont edit-btn" }, "✏️ Modifica le carte del mazzo integrato");
  wrap.appendChild(editBtn);
  const editorPanel = el("div", { class: "editor-panel", style: "display:none" });
  wrap.appendChild(editorPanel);

  let editorUnlocked = false;
  editBtn.addEventListener("click", () => {
    const visible = editorPanel.style.display !== "none";
    if (visible) { editorPanel.style.display = "none"; return; }
    if (!editorUnlocked) {
      const pw = window.prompt("Inserisci la password per modificare le carte:");
      if (pw === null) return;
      if (pw !== EDITOR_PASSWORD) { errorBox.textContent = "Password errata."; return; }
      editorUnlocked = true;
    }
    errorBox.textContent = "";
    editorPanel.style.display = "block";
    renderEditor();
  });

  function renderEditor() {
    editorPanel.innerHTML = "";
    editorPanel.appendChild(el("p", { class: "csv-hint" }, "Max 60 caratteri per il concetto, max 300 per la definizione. Le modifiche restano salvate su questo browser/dispositivo finché non le ripristini."));

    const rowInputs = DECKS.cybersecurity.cards.map((c) => ({
      termInput: el("input", { type: "text", maxlength: "60", value: c.term }),
      defInput: el("textarea", { maxlength: "300", rows: "2" }, c.definition),
    }));

    rowInputs.forEach((r, i) => {
      const termCounter = el("span", { class: "char-counter" }, `${r.termInput.value.length}/60`);
      const defCounter = el("span", { class: "char-counter" }, `${r.defInput.value.length}/300`);
      r.termInput.addEventListener("input", () => { termCounter.textContent = `${r.termInput.value.length}/60`; });
      r.defInput.addEventListener("input", () => { defCounter.textContent = `${r.defInput.value.length}/300`; });

      editorPanel.appendChild(
        el(
          "div", { class: "editor-row" },
          el("span", { class: "editor-num" }, `#${i + 1}`),
          el(
            "div", { class: "editor-fields" },
            el("div", { class: "editor-field-label" }, el("label", {}, "Concetto"), termCounter),
            r.termInput,
            el("div", { class: "editor-field-label" }, el("label", {}, "Definizione"), defCounter),
            r.defInput
          )
        )
      );
    });

    const editorStatus = el("p", { class: "csv-status" }, "");
    const saveBtn = el("button", {
      class: "btn btn-know",
      onclick: () => {
        const updated = rowInputs.map((r, i) => ({
          term: r.termInput.value.trim() || DECKS.cybersecurity.cards[i].term,
          definition: r.defInput.value.trim(),
        }));
        saveCustomDeck(updated);
        editorStatus.textContent = "Modifiche salvate su questo dispositivo.";
        refreshReferenceTable();
      },
    }, "💾 Salva modifiche");
    const resetBtn = el("button", {
      class: "btn btn-dont",
      onclick: () => {
        if (!window.confirm("Ripristinare i concetti originali? Le modifiche salvate andranno perse.")) return;
        resetCustomDeck();
        renderEditor();
        refreshReferenceTable();
      },
    }, "↺ Ripristina originali");

    editorPanel.appendChild(el("div", { class: "btn-row wrap" }, saveBtn, resetBtn));
    editorPanel.appendChild(editorStatus);
  }

  // stampa mazzo
  const printBtn = el("button", {
    class: "btn btn-dont print-btn",
    onclick: () => {
      const pool = getSelectedPool();
      if (!pool) { errorBox.textContent = "Seleziona o carica un mazzo prima di stampare."; return; }
      errorBox.textContent = "";
      printDeck(numberPool(pool));
    },
  }, "🖨 Stampa le carte fisiche");
  wrap.appendChild(printBtn);

  // assegnazione manuale
  const manualToggleWrap = el("div", { class: "manual-toggle" });
  const manualCheckbox = el("input", { type: "checkbox", id: "manual-assign" });
  manualToggleWrap.appendChild(manualCheckbox);
  manualToggleWrap.appendChild(el("label", { for: "manual-assign" }, "Assegna le carte manualmente ai team (carte fisiche già distribuite)"));
  wrap.appendChild(manualToggleWrap);

  const refDetails = el("details", { class: "ref-details" });
  refDetails.appendChild(el("summary", {}, "Riferimento numero → concetto"));
  const refTableBody = el("div", { class: "ref-table" });
  refDetails.appendChild(refTableBody);
  wrap.appendChild(refDetails);

  function refreshReferenceTable() {
    refTableBody.innerHTML = "";
    const pool = getSelectedPool();
    if (!pool) { refTableBody.appendChild(el("p", { class: "csv-hint" }, "Nessun mazzo selezionato.")); return; }
    numberPool(pool).forEach((c) => {
      refTableBody.appendChild(el("div", { class: "ref-row" }, el("span", { class: "ref-num" }, `#${c.id}`), el("span", {}, c.term)));
    });
  }
  refreshReferenceTable();
  updateSourceVisibility();

  const namesWrap = el("div", { class: "names-grid" });
  wrap.appendChild(namesWrap);

  function renderTeamFields(count) {
    namesWrap.innerHTML = "";
    nameInputs = [];
    assignInputs = [];
    for (let i = 0; i < count; i++) {
      const nameInput = el("input", { type: "text", placeholder: `Team ${i + 1}` });
      nameInputs.push(nameInput);
      const field = el("div", { class: "name-field" }, el("label", {}, `Team ${i + 1}`), nameInput);
      if (manualCheckbox.checked) {
        const assignInput = el("input", { type: "text", placeholder: "es. 1,5,9,13" });
        assignInputs.push(assignInput);
        field.appendChild(el("label", { class: "assign-label" }, "Numeri carte"));
        field.appendChild(assignInput);
      } else {
        assignInputs.push(null);
      }
      namesWrap.appendChild(field);
    }
  }
  renderTeamFields(4);

  teamCountInput.addEventListener("change", () => {
    let n = parseInt(teamCountInput.value, 10);
    if (Number.isNaN(n)) n = 4;
    n = Math.max(2, Math.min(6, n));
    teamCountInput.value = n;
    renderTeamFields(n);
  });
  manualCheckbox.addEventListener("change", () => {
    renderTeamFields(parseInt(teamCountInput.value, 10) || 4);
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

        const pool = getSelectedPool();
        if (!pool) { errorBox.textContent = "Carica prima un CSV valido, oppure scegli il mazzo integrato."; return; }

        const numbered = numberPool(pool);
        const teamNames = nameInputs.map((inp, i) => inp.value.trim() || `Team ${i + 1}`);

        if (manualCheckbox.checked) {
          const assignments = [];
          const usedNumbers = new Set();
          for (let i = 0; i < teamCount; i++) {
            const raw = (assignInputs[i] && assignInputs[i].value) || "";
            const numbers = raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
            if (numbers.length !== cardsPerTeam) {
              errorBox.textContent = `${teamNames[i]}: servono esattamente ${cardsPerTeam} numeri, ne hai inseriti ${numbers.length}.`;
              return;
            }
            for (const n of numbers) {
              if (n < 1 || n > numbered.length) {
                errorBox.textContent = `${teamNames[i]}: il numero ${n} non esiste nel mazzo (1–${numbered.length}).`;
                return;
              }
              if (usedNumbers.has(n)) {
                errorBox.textContent = `Il numero ${n} è assegnato a più di un team.`;
                return;
              }
              usedNumbers.add(n);
            }
            assignments.push(numbers);
          }
          errorBox.textContent = "";
          historyStack = [];
          redoStack = [];
          state = initStateManual(numbered, teamNames, assignments);
          render();
        } else {
          if (numbered.length < needed) {
            errorBox.textContent = `Servono almeno ${needed} concetti (${teamCount} team × ${cardsPerTeam} carte), il mazzo scelto ne ha solo ${numbered.length}.`;
            return;
          }
          errorBox.textContent = "";
          historyStack = [];
          redoStack = [];
          state = initStateAuto(numbered, teamNames, cardsPerTeam);
          render();
        }
      },
    }, "Inizia partita")
  );

  root.appendChild(wrap);
}

document.addEventListener("DOMContentLoaded", showSetup);
