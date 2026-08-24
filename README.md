# Dubito: Concetti

Gioco da classe ispirato a "Dubito", per ripassare concetti visti a lezione tramite bluff e sfide. Pensato per essere proiettato/condiviso da un solo dispositivo (telefono o tablet del/la formatore/trice) che guida il gioco davanti alla classe.

Nessun login, nessuna build: è puro HTML/CSS/JS, apribile direttamente in un browser o ospitabile gratis su GitHub Pages.

## Personalizzazione (numero team, carte, contenuti)

Nella schermata iniziale ora si può impostare:

- **numero di team** (2–6),
- **carte per team** (2–8),
- **mazzo**: quello integrato (Cybersecurity, 16 concetti) oppure un **CSV personalizzato** caricato al volo.

Formato CSV: due colonne, `term,definition` (la prima riga come intestazione è facoltativa — se non è "term/concetto/parola" viene trattata già come contenuto). Dal menu di setup c'è un link "Scarica un CSV di esempio" che genera il file nel formato corretto partendo dal mazzo integrato. Il mazzo caricato deve contenere almeno *team × carte per team* righe, altrimenti l'app mostra un errore invece di far partire la partita.

## Carte fisiche e assegnazione manuale

Dal menu di setup si può:
- **stampare le carte fisiche** del mazzo selezionato (🖨), con un lato pubblico numerato da ritagliare e una tabella di riferimento numero → concetto per il/la formatore/trice;
- spuntare **"Assegna le carte manualmente ai team"** se le carte fisiche sono già state distribuite: in questo caso si inseriscono i numeri delle carte di ciascun team (es. `1,5,9,13`) invece di lasciare che l'app le distribuisca a caso.

Durante la partita, quando un team gioca una carta ne sceglie semplicemente il numero: il contenuto (termine/definizione) resta quello scritto sulla carta fisica corrispondente.

## Modifica del mazzo integrato

Dal menu di setup, il pulsante "✏️ Modifica le carte del mazzo integrato" (protetto da password) apre un editor per cambiare termine e definizione di ciascuna delle 16 carte del mazzo Cybersecurity. Le modifiche vengono salvate nel `localStorage` del browser/dispositivo usato e restano finché non si preme "↺ Ripristina originali".

## Pausa, fine partita e cronologia

Durante la partita, dalla barra in alto:
- **↶ Annulla / ↷ Ripeti** tornano indietro o rifanno l'ultima azione (fino a 60 passi);
- **⏸ Pausa** nasconde il contenuto della carta corrente (utile se serve interrompere senza rivelare nulla);
- **⏹ Termina** chiude la partita subito, congelando il punteggio attuale;
- **🏠 Menu** torna alla schermata iniziale, abbandonando la partita in corso.

## Correzione manuale dei punteggi

Accanto al punteggio di ogni team, in qualsiasi momento della partita:
- i pulsanti **−** / **+** correggono di un punto;
- toccare il numero apre un prompt per impostare un valore esatto.

Ogni correzione manuale viene comunque registrata nella cronologia, per tenere traccia di cosa è stato aggiustato a mano.

## Regole implementate

- 4 team, 4 carte a testa (16 concetti per mazzo).
- A turno, il team attivo rivela una carta e dichiara se conosce o non conosce il concetto.
- Gli altri tre team dichiarano a loro volta "la conosco" / "non la conosco".
- Il team attivo può poi:
  - enunciare direttamente la risposta (solo se aveva dichiarato di conoscerla) → **+2** se corretta, **-2** se sbagliata, turno chiuso;
  - oppure dubitare di un team che ha dichiarato "la conosco". Il team dubitato sceglie se:
    - tentare la risposta (rischio **-2** se sbaglia, **+1** se indovina e turno chiuso),
    - ammettere di non sapere (**-1** sicuro).
  - Se il dubitato fallisce, il team attivo può enunciare la propria risposta (se l'aveva dichiarata) o dubitare un altro team, a catena.
- Se nessun team indovina e le opzioni si esauriscono, il team attivo ha un ultimo tentativo (**+2**/**-2**).
- Se il team attivo dichiara di non sapere e nessun altro dichiara di conoscere il concetto, il turno si chiude senza punti.
- **Assunzione da verificare con te**: ogni team che ha dichiarato "la conosco" ma non è mai stato chiamato a rispondere (né dal dubbio né come propria risposta) riceve **+1** automatico a fine turno — è la ricompensa per una dichiarazione "onesta" mai messa alla prova, il motore del bluff nel gioco. Se preferisci che questo bonus non scatti (cioè che dichiarare "la conosco" senza mai essere sfidati non dia punti), è una modifica di poche righe in `app.js` (funzione `grantUnchallengedBonus`).

## File

```
index.html    struttura + stile (tema scuro, palette ambra/teal/magenta/indigo)
app.js        motore di gioco (macchina a stati del turno)
decks.js      mazzi di concetti — qui vanno aggiunti i mazzi per altre lezioni
```

## Aggiungere un nuovo mazzo (altro argomento)

Apri `decks.js`, copia il blocco `cybersecurity`, cambia chiave/nome e i 16 concetti con relative definizioni, poi aggiungi la voce a `DECK_LIST` in fondo al file. Non serve toccare `app.js`.

Nota: `app.js` mostra nel menu di setup solo il mazzo `cybersecurity` più il caricamento CSV — per selezionare anche altri mazzi aggiunti a `decks.js` va aggiornata la funzione `showSetup()` in `app.js`.

## Uso in classe

1. Apri `index.html` sul dispositivo che proietti (o collegalo allo schermo).
2. Scegli il mazzo, inserisci i nomi dei team, avvia.
3. Il/la formatore/trice guida i click seguendo le dichiarazioni verbali dei team, e giudica "Corretto/Sbagliato" quando qualcuno risponde.

## Deploy gratuito su GitHub Pages

```bash
git init
git add .
git commit -m "Prima versione di Dubito: Concetti"
git branch -M main
git remote add origin <URL_DELLA_TUA_REPO_VUOTA>
git push -u origin main
```

Poi su GitHub: **Settings → Pages → Source: Deploy from branch → main / (root)**. Dopo un minuto il gioco sarà raggiungibile a un link tipo `https://<utente>.github.io/<repo>/`, condivisibile con gli altri formatori.

## Continuare lo sviluppo con Claude Code

Questa cartella è già pronta per essere aperta come progetto in Claude Code:

```bash
cd dubito-concetti
claude
```

Da lì puoi chiedere modifiche (es. numero variabile di team, cronometro per turno, salvataggio automatico dei mazzi) e collegare/pushare direttamente sulla repo GitHub una volta che ne hai creata una vuota su github.com e configurato l'accesso (`gh auth login` oppure una remote con token).
