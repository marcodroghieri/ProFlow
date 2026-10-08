# ProFlow — Documentazione

## Descrizione

ProFlow è una piattaforma web per freelancer che permette di gestire appuntamenti, fatture e prenotazioni da parte dei clienti. Il sistema è composto da un frontend HTML/CSS/JS, un backend Node.js con Express e un database PostgreSQL.

---

## Requisiti di sistema

- [Node.js](https://nodejs.org/) (versione 18 o superiore)
- [PostgreSQL](https://www.postgresql.org/) (versione 14 o superiore)
- Un browser moderno (Chrome, Firefox, Edge, Safari)

---

## Avvio dell'applicazione

### 1. Configurare il database

Aprire il terminale e accedere a PostgreSQL:

```bash
psql -U postgres
```

Eseguire il file SQL per creare il database e le tabelle:

```bash
psql -U postgres -f src/database.sql
```

### 2. Installare le dipendenze

Dalla cartella radice del progetto, eseguire:

```bash
npm install
```

### 3. Configurare le variabili d'ambiente

Creare nella cartella radice il file `.env` (non incluso nel repository) con il seguente contenuto:

```
JWT_SECRET=your_secret_key_here
DB_PASSWORD=your_postgres_password
```

### 4. Avviare il server

```bash
npm start
```

Il server si avvia sulla porta **3000**. Aprire il browser e navigare a:

```
http://localhost:3000
```

---

## Struttura del progetto

```
progetto/
├── src/
│   ├── server.js              # Server Node.js (backend principale)
│   ├── report-worker.js       # Worker per la generazione dell'export CSV in un thread separato
│   ├── database.sql           # Schema del database
│   ├── public/                # Pagine accessibili senza login
│   │   ├── index.html         # Homepage
│   │   ├── login.html         # Pagina di accesso
│   │   ├── signup.html        # Pagina di registrazione
│   │   ├── book.html          # Pagina pubblica di prenotazione per i clienti
│   │   ├── style/             # Foglio di stile delle pagine pubbliche
│   │   └── script/            # Script JS delle pagine pubbliche
│   └── private/               # Pagine accessibili solo dopo il login
│       ├── dashboard.html     # Dashboard principale (con grafico statistiche)
│       ├── agenda.html        # Gestione appuntamenti (con ricerca/filtro)
│       ├── invoices.html      # Gestione fatture (con export CSV)
│       ├── booking-link.html  # Link di prenotazione personale
│       ├── analytics.html     # Analisi (piano a pagamento)
│       ├── automated-workflow.html  # Workflow automatizzati (piano a pagamento)
│       ├── upgrade-plan.html  # Pagina di upgrade
│       ├── style/             # Foglio di stile delle pagine private
│       └── script/            # Script JS delle pagine private
├── assets/                    # Immagini e loghi
├── .env                       # Variabili d'ambiente (JWT secret, password del database): locale, non nel repository
└── package.json               # Dipendenze e script npm
```

---

## Utilizzo dell'applicazione

### Registrazione e login

1. Aprire `http://localhost:3000` e cliccare su **Get Started** per registrarsi.
2. Inserire nome, email e password, oppure utilizzare il pulsante **Sign in with Google**.
3. Dopo il login si viene reindirizzati alla **dashboard**.

### Gestione appuntamenti (Agenda)

- Dalla sidebar, cliccare su **Agenda**.
- Usare il modulo in alto per aggiungere un nuovo appuntamento (titolo, data/ora e importo).
- Ogni appuntamento può essere eliminato tramite il pulsante **Remove**.
- Lo stato di pagamento (pending/paid) si aggiorna dalla pagina **Invoices**.
- È possibile cercare e filtrare gli appuntamenti per titolo, stato e data tramite la barra di filtro sopra la lista.

### Fatture (Invoices)

- Dalla sidebar, cliccare su **Invoices**.
- La lista mostra tutti gli appuntamenti con il relativo importo e stato di pagamento.
- Cliccare su **Mark as Paid** o **Mark as Pending** per aggiornare lo stato.
- Il bottone **Export CSV Report** genera e scarica un report CSV di tutti gli appuntamenti.

### Link di prenotazione pubblica (Booking Link)

- Dalla sidebar, cliccare su **Booking Link**.
- La pagina mostra l'indirizzo pubblico da condividere con i clienti: `http://localhost:3000/book.html`.
- I clienti possono aprire quel link senza fare login e prenotare un appuntamento direttamente.

### Logout

- Cliccare sull'icona di logout in fondo alla sidebar per uscire dall'account.

---

## Funzionalità aggiuntive (rivalutazione orale)

In seguito al primo colloquio orale, sono state implementate le seguenti funzionalità aggiuntive, concordate e approvate dal docente via email.

### Importo reale degli appuntamenti (`amount`)

- Aggiunto un campo `amount` alla tabella `appointments`, per registrare l'importo effettivo di ogni prestazione (in precedenza il ricavo mostrato in dashboard era una stima calcolata, non un dato reale).
- Il campo è visibile e modificabile dal form di creazione appuntamento in **Agenda**, e viene mostrato correttamente in **Invoices**.
- La card "Total Revenue" nella dashboard mostra ora la somma reale degli importi degli appuntamenti con stato **paid** (gli appuntamenti *pending* non vengono conteggiati, poiché non rappresentano un incasso confermato).

### Analisi statistiche con grafico (Google Charts)

- Nuova rotta backend `GET /api/analytics`, che restituisce il conteggio degli appuntamenti raggruppati per mese e per stato (paid/pending).
- Il risultato viene visualizzato nella **Dashboard** tramite un grafico a colonne realizzato con **Google Charts**, che mostra l'andamento mensile degli appuntamenti suddivisi per stato di pagamento.

### Worker per l'esportazione dei dati (`worker_threads`)

- Nuova rotta `GET /api/appointments/export`, che genera un report **CSV** di tutti gli appuntamenti dell'utente.
- La generazione del report avviene in un **thread separato** tramite il modulo nativo `worker_threads` di Node.js, per non bloccare il thread principale del server durante l'elaborazione.
- Il bottone **"Export CSV Report"**, disponibile nella pagina **Invoices**, avvia il download del file.

### Ricerca e filtro degli appuntamenti (Agenda)

- Nella pagina **Agenda** è stata aggiunta una barra di filtro che permette di cercare gli appuntamenti per:
  - **testo** (titolo, ricerca parziale e case-insensitive)
  - **stato** (paid / pending / tutti)
  - **data** specifica
- I filtri sono combinabili tra loro e vengono applicati interamente lato client, sui dati già caricati dal server, senza richieste aggiuntive al backend.

---

## Tecnologie utilizzate

| Tecnologia | Utilizzo |
|---|---|
| HTML5 | Struttura delle pagine |
| CSS3 | Stile e layout responsivo |
| JavaScript (ES6+) | Logica frontend, DOM, fetch API |
| Node.js | Runtime server-side |
| Express.js | Framework per le rotte HTTP |
| PostgreSQL | Database relazionale |
| JWT (jsonwebtoken) | Autenticazione tramite token |
| bcrypt | Hashing delle password |
| dotenv | Gestione variabili d'ambiente |
| Google OAuth 2.0 | Login con account Google |
| Google Charts | Visualizzazione grafica delle statistiche in dashboard |
| worker_threads (Node.js) | Esecuzione dell'export CSV in un thread separato |