# Dubito: Concetti

Gioco da classe ispirato a "Dubito", per ripassare concetti visti a lezione tramite bluff e sfide. Pensato per essere proiettato/condiviso da un solo dispositivo (telefono o tablet del/la formatore/trice) che guida il gioco davanti alla classe.

Nessun login, nessuna build: è puro HTML/CSS/JS, apribile direttamente in un browser o ospitabile gratis su GitHub Pages.

## Schermata iniziale

All'apertura dell'app c'è un menu con cinque voci:

- **▶️ Inizia partita** → apre la pagina "Nuova partita" (numero di team, carte per team, scelta del mazzo, flag per l'assegnazione manuale, nomi dei team).
- **⏯ Riprendi partita** → visibile solo se c'è una partita in corso non ancora conclusa, riporta esattamente al turno in sospeso.
- **🗂 Vedi mazzi** → elenco di tutti i mazzi disponibili, con anteprima dei concetti e stampa delle carte fisiche.
- **⚙️ Impostazioni avanzate** → protetta da password (`Maur0!`), per caricare nuovi mazzi da CSV o modificare i concetti di un mazzo esistente.
- **📖 Regole / Come si gioca** → riepilogo delle regole per chi guida la partita.

Da qualunque pagina secondaria si torna al menu con "← Home"; durante una partita, il pulsante "🏠 Menu" nella barra in alto fa lo stesso senza interrompere la partita (si può riprendere in seguito).

## Nuova partita (numero team, carte, contenuti)

Nella pagina "Nuova partita" si imposta:

- **numero di team** (2–6),
- **carte per team** (2–8),
- **mazzo**: uno qualsiasi tra quelli disponibili (integrati + quelli creati da "Impostazioni avanzate"),
- **assegnazione manuale**: se spuntata, si inseriscono i numeri delle carte fisiche già distribuite a ciascun team (es. `1,5,9,13`) invece di lasciare che l'app le distribuisca a caso,
- i **nomi dei team**.

## Vedi mazzi, carte fisiche e stampa

La pagina "Vedi mazzi" elenca ogni mazzo con il numero di concetti e un pannello a comparsa per consultarli. Ogni mazzo ha un pulsante **🖨 Stampa questo mazzo**, che genera un foglio con un lato pubblico numerato (da ritagliare) e una tabella di riferimento numero → concetto per chi guida il gioco.

Durante la partita, quando un team gioca una carta ne sceglie semplicemente il numero: il contenuto (termine/definizione) resta quello scritto sulla carta fisica corrispondente.

## Impostazioni avanzate: mazzi personalizzati

La pagina "Impostazioni avanzate" (password `Maur0!`) permette di:
- **caricare un nuovo mazzo da CSV** (colonne `term,definition`, prima riga facoltativa come intestazione), dandogli un nome — diventa subito selezionabile in "Nuova partita" e in "Vedi mazzi";
- **modificare le carte di un mazzo esistente** (integrato o caricato): il numero di ogni carta resta fisso (corrisponde al lato pubblico già stampato), mentre concetto e definizione sono modificabili. Per i mazzi integrati c'è un pulsante "↺ Ripristina originali"; per quelli caricati c'è "🗑 Elimina mazzo".

Tutte le modifiche vengono salvate nel `localStorage` del browser/dispositivo usato.

## Pausa, fine partita e cronologia

Durante la partita, dalla barra in alto:
- **↶ Annulla / ↷ Ripeti** tornano indietro o rifanno l'ultima azione (fino a 60 passi);
- **🌀 Concetti** apre una schermata a tutto schermo in cui tutte le parole del mazzo in uso fluttuano e rimbalzano sui bordi, in ordine sparso (come un vecchio screensaver): utile prima di iniziare o come pausa a effetto durante la partita. Si chiude con un clic in un punto qualsiasi (o con Esc);
- **⏸ Pausa** nasconde il contenuto della carta corrente (utile se serve interrompere senza rivelare nulla);
- **⏹ Termina** chiude la partita subito, congelando il punteggio attuale;
- **🏠 Menu** torna alla schermata iniziale senza perdere la partita in corso (si riprende da "⏯ Riprendi partita").

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

Il modo più semplice è dalla pagina "Impostazioni avanzate" → "Carica un nuovo mazzo da CSV" (vedi sopra), senza toccare il codice.

In alternativa, per includere un mazzo direttamente nel codice sorgente: apri `decks.js`, copia il blocco `cybersecurity`, cambia chiave/nome e i concetti con relative definizioni, poi aggiungi la voce a `DECK_LIST` in fondo al file. Non serve toccare `app.js`: la lista dei mazzi nel menu si aggiorna automaticamente.

## Uso in classe

1. Apri `index.html` sul dispositivo che proietti (o collegalo allo schermo).
2. Dal menu iniziale scegli "▶️ Inizia partita", imposta mazzo e nomi dei team, avvia.
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
