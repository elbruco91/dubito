/**
 * DECKS
 * Ogni mazzo deve contenere ESATTAMENTE 16 concetti (4 per team).
 * "term" = parola mostrata pubblicamente quando la carta viene rivelata.
 * "definition" = testo mostrato solo dopo la risoluzione del turno
 *                (quando il/la formatore/trice preme "Mostra definizione").
 *
 * Per creare un nuovo mazzo per un'altra lezione: copia un blocco,
 * cambia la chiave (es. "media_literacy"), il "name" e i 16 concetti,
 * poi aggiungi la chiave all'elenco in fondo a questo file.
 */

const DECKS = {
  cybersecurity: {
    name: "Cybersecurity",
    cards: [
      { term: "Phishing", definition: "Truffa via email, SMS o messaggi che imita un mittente affidabile per rubare dati personali, password o codici di accesso." },
      { term: "Ransomware", definition: "Software malevolo che blocca o cifra i file di un dispositivo e chiede un riscatto (ransom) per sbloccarli." },
      { term: "Doxing", definition: "Pubblicare informazioni private o identificative su una persona (indirizzo, numero, luoghi frequentati) senza il suo consenso, spesso per intimidirla." },
      { term: "Malware", definition: "Termine generico per qualsiasi software creato per danneggiare, spiare o prendere il controllo di un dispositivo." },
      { term: "Social engineering", definition: "Tecniche di manipolazione psicologica usate per convincere una persona a rivelare informazioni riservate o compiere azioni rischiose." },
      { term: "Spoofing", definition: "Falsificare l'identità di un mittente (email, numero di telefono, sito web) per far credere che la comunicazione provenga da una fonte affidabile." },
      { term: "Password cracking", definition: "L'insieme di tecniche usate per indovinare o forzare una password, ad esempio provando combinazioni comuni o rubando database di credenziali." },
      { term: "Autenticazione a due fattori (2FA)", definition: "Sistema di sicurezza che richiede due prove d'identità diverse (es. password + codice via app o SMS) per accedere a un account." },
      { term: "VPN", definition: "Rete privata virtuale che cripta la connessione internet e nasconde l'indirizzo IP reale dell'utente." },
      { term: "Cookie di tracciamento", definition: "Piccoli file salvati dai siti web nel browser per riconoscere l'utente e seguirne le abitudini di navigazione, spesso a fini pubblicitari." },
      { term: "Data breach", definition: "Violazione informatica in cui dati riservati (spesso di molti utenti) vengono sottratti o esposti senza autorizzazione." },
      { term: "Firewall", definition: "Sistema che filtra il traffico di rete in entrata e in uscita da un dispositivo, bloccando connessioni non autorizzate." },
      { term: "Ingegneria del consenso (dark pattern)", definition: "Elementi di design pensati per spingere l'utente a compiere azioni che non farebbe consapevolmente (es. accettare tutti i cookie, iscriversi senza volerlo)." },
      { term: "Botnet", definition: "Rete di dispositivi infettati e controllati da remoto, spesso usata per attacchi su larga scala senza che i proprietari se ne accorgano." },
      { term: "Zero-day", definition: "Vulnerabilità di un software sconosciuta al produttore e non ancora corretta, quindi sfruttabile dagli attaccanti prima che venga risolta." },
      { term: "Catfishing", definition: "Creare un'identità online falsa, spesso con foto e dati rubati, per instaurare una relazione ingannevole con qualcuno." },
    ],
  },
};

// Elenco dei mazzi disponibili nel menu di selezione (chiave in DECKS + etichetta).
const DECK_LIST = [
  { key: "cybersecurity", label: "Cybersecurity" },
  // Aggiungi qui altri mazzi, es: { key: "media_literacy", label: "Media Literacy" },
];
