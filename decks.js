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
      { term: "Cybersecurity", definition: "L'insieme di pratiche, tecnologie e comportamenti usati per proteggere dispositivi, reti e dati da attacchi, danni o accessi non autorizzati." },
      { term: "GDPR", definition: "Il Regolamento europeo (UE 2016/679) sulla protezione dei dati personali: stabilisce diritti per i cittadini e obblighi per chi tratta i loro dati." },
      { term: "Cookie", definition: "Piccoli file che i siti web salvano nel browser per riconoscere l'utente, ricordare preferenze o tracciarne la navigazione." },
      { term: "Indirizzo IP", definition: "Il codice numerico univoco che identifica un dispositivo collegato a una rete, permettendo di farlo comunicare online e, in parte, di localizzarlo." },
      { term: "Polizia Postale", definition: "La specialità della Polizia di Stato italiana che si occupa di reati informatici, cybercrimine e sicurezza delle comunicazioni." },
      { term: "Exif", definition: "I metadati nascosti in una foto digitale (data, modello del dispositivo, a volte le coordinate GPS) che possono rivelare informazioni non visibili nell'immagine." },
      { term: "HTTPS", definition: "La versione sicura e cifrata del protocollo HTTP: protegge i dati scambiati tra il browser e il sito web visitato." },
      { term: "Garante privacy", definition: "L'autorità italiana indipendente che vigila sul rispetto delle norme sulla protezione dei dati personali." },
      { term: "Phishing", definition: "Truffa via email, SMS o messaggi che imita un mittente affidabile per rubare dati personali, password o codici di accesso." },
      { term: "Sextortion", definition: "Ricatto in cui si minaccia di diffondere immagini o video intimi della vittima per estorcerle denaro o altri favori." },
      { term: "Social Engineering", definition: "Tecniche di manipolazione psicologica usate per convincere una persona a rivelare informazioni riservate o compiere azioni rischiose." },
      { term: "Schema Piramidale", definition: "Sistema fraudolento in cui i guadagni promessi dipendono dal reclutamento di nuovi partecipanti, anziché da un vero prodotto o servizio, ed è destinato a collassare." },
      { term: "Malware", definition: "Termine generico per qualsiasi software creato per danneggiare, spiare o prendere il controllo di un dispositivo." },
      { term: "Spoofing", definition: "Falsificare l'identità di un mittente (email, numero di telefono, sito web) per far credere che la comunicazione provenga da una fonte affidabile." },
      { term: "Ransomware", definition: "Software malevolo che blocca o cifra i file di un dispositivo e chiede un riscatto (ransom) per sbloccarli." },
      { term: "2FA", definition: "Autenticazione a due fattori: un sistema di sicurezza che richiede due prove d'identità diverse (es. password + codice via app o SMS) per accedere a un account." },
    ],
  },
};

// Elenco dei mazzi disponibili nel menu di selezione (chiave in DECKS + etichetta).
const DECK_LIST = [
  { key: "cybersecurity", label: "Cybersecurity" },
  // Aggiungi qui altri mazzi, es: { key: "media_literacy", label: "Media Literacy" },
];
