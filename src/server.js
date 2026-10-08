// MODULI ESTERNI
const path = require('path');                               // Gestisce i percorsi dei file in modo sicuro su qualsiasi sistema operativo
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });   // Carica le variabili d'ambiente (es. JWT_SECRET) dal file .env nella radice del progetto
const express = require('express');                         // Framework che gestisce il server web e le rotte
const { Pool } = require('pg');                             // Driver per comunicare con il database PostgreSQL
const bcrypt = require('bcrypt');                           // Cifra le password con hashing prima di salvarle
const jwt = require('jsonwebtoken');                        // Genera e verifica i token JWT di autenticazione
const cookieParser = require('cookie-parser');              // Permette al server di leggere i cookie inviati dal browser
const { OAuth2Client } = require('google-auth-library');    // Libreria ufficiale di Google per verificare il login OAuth
const googleClient = new OAuth2Client("410866438979-8tevk148t75op8eo9snfrgrincjcagld.apps.googleusercontent.com");  // Client ID pubblico dell'app Google
const { Worker } = require("worker_threads");   // Importa la classe Worker dal modulo nativo di Node.js

// Inizializzazione dell'applicazione
const app = express();
const PORT = 3000;

// Chiave segreta usata per firmare e verificare i JWT (caricata dal .env, mai scritta nel codice)
const JWT_SECRET = process.env.JWT_SECRET;

// CONNESSIONE AL DATABASE
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'proflow',
    password: process.env.DB_PASSWORD,
    port: 5432
});

// Verifica che la connessione al database funzioni all'avvio
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection failed: ', err.stack);
    } else {
        console.log('Connected to PostgreSQL successfully.')
    }
});

// MIDDLEWARE
app.use(express.json());       // Legge il body JSON delle richieste POST
app.use(cookieParser());       // Abilita la lettura dei cookie lato server

app.use(express.static(path.join(__dirname, 'public')));                  // Serve i file pubblici (HTML, CSS, JS) accessibili a tutti
app.use('/assets', express.static(path.join(__dirname, '..', 'assets'))); // Serve immagini e loghi dalla cartella assets


// ROTTA DI REGISTRAZIONE (SIGNUP)
app.post('/api/signup', async (req, res) => {

    try {
        const { name, email, password } = req.body;       // Estrae i dati inseriti dall'utente nel form

        if(!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required."});
        }
        // Query parametrizzata ($1): i dati non si concatenano nella stringa, così si previene la SQL Injection
        const emailCheck = await pool.query('SELECT * FROM users where email = $1', [email]);

        if(emailCheck.rows.length > 0) {
            return res.status(401).json({ message: "This email is already registered!"});
        }

        // Hashing della password: non salviamo mai la password in chiaro nel database
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Inserimento del nuovo utente con query parametrizzata
        const insertQuery = 'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)';
        await pool.query(insertQuery, [name, email, hashedPassword]);

        return res.status(201).json({ message: "Account created successfully!" });

      } catch(error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Internal server error."});
    }

});

// ROTTA DI LOGIN - autenticazione con JWT e Cookie
 app.post('/api/login', async (req, res) => {

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: " Fill in both fields. "});
        }

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const user = userResult.rows[0];

        // Gli utenti registrati con Google non hanno password nel database: vanno respinti qui
        if (user.password === null) {
            return res.status(401).json({ message: "This account was created with Google. Please sign in with Google." });
        }

        // Confronta la password digitata con l'hash salvato: bcrypt.compare gestisce il confronto in modo sicuro
        const isPasswordValid = await bcrypt.compare(password, user.password);

        // Se le password non corrispondono blocchiamo l'accesso
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials."});
        }

        // GENERAZIONE DEL JWT
        // Payload: dati NON sensibili dell'utente da inserire nel token (mai la password)
        const jwtPayload = {
            userId: user.id,
            email: user.email
        };

        // Firma il token con la chiave segreta: garantisce che il token non possa essere falsificato
        const token = jwt.sign(jwtPayload, JWT_SECRET, {
            algorithm: 'HS256',     // Algoritmo di firma simmetrico (stessa chiave per firmare e verificare)
            expiresIn: '1h'         // Scadenza breve: limita il danno se il token viene rubato
        });

        // Salviamo il token in un cookie sicuro invece che nel JavaScript del browser
        res.cookie('token', token, {
            httpOnly: true,     // Il cookie non è leggibile da JavaScript: protezione contro attacchi XSS
            secure: process.env.NODE_ENV === 'production',  // In produzione viaggia solo su HTTPS
            sameSite: 'Strict',    // Il cookie non viene inviato da siti esterni: protezione contro attacchi CSRF
            maxAge: 3600000     // Durata del cookie in millisecondi (1 ora)
        });

        return res.json({ success: true, message: "Login successful" });

    } catch(error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }

 });

// ROTTA DI AUTENTICAZIONE CON GOOGLE (OAuth)
app.post("/api/auth/google", async (req, res) => {
    try {
        const { token } = req.body;     // Token generato da Google e inviato dal frontend

        if(!token) {
            return res.status(400).json({ success: false, message: "Token not provided."})
        }

        // Chiediamo a Google di verificare che il token sia autentico e valido
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: "410866438979-8tevk148t75op8eo9snfrgrincjcagld.apps.googleusercontent.com"
        });

        // Estraiamo i dati dell'utente certificati da Google
        const payload = ticket.getPayload();
        const googleEmail = payload.email;
        const googleName = payload.given_name || payload.name;

        console.log(`Google ha verificato l'utente: ${googleName} (${googleEmail})`);

        // Controlliamo se esiste già un account con questa email
        const existingUser = await pool.query('SELECT id, password FROM users WHERE email = $1', [googleEmail]);

        // Se l'email è già registrata CON password (account manuale), blocchiamo: evita il furto dell'account
        if (existingUser.rows.length > 0 && existingUser.rows[0].password !== null) {
            return res.status(409).json({ success: false, message: "This email is already registered with a password. Please log in with your email and password." });
        }

        // Se l'utente non esiste lo creiamo; se esiste già come utente Google non facciamo nulla (ON CONFLICT DO NOTHING)
        const dbResult = await pool.query(
            `INSERT INTO users (name, email)
             VALUES ($1, $2)
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [googleName, googleEmail]
        );

        // Se l'INSERT non ha restituito un id (utente già esistente), recuperiamo l'id dall'utente trovato prima
        const userId = dbResult.rows.length > 0 ? dbResult.rows[0].id : existingUser.rows[0].id;
        console.log(`Utente allineato sul Database. ID Reale: ${userId}`)

        const jwtPayload = {
            userId: userId,
            email: googleEmail
        };
        const localToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '1h' });

        // Salviamo il token nel cookie sicuro, esattamente come nel login manuale
        res.cookie("token", localToken, {
            httpOnly: true,         // Non leggibile da JavaScript: protezione contro XSS
            secure: process.env.NODE_ENV === 'production',  // In produzione solo su HTTPS
            sameSite: 'Strict',     // Protezione contro CSRF
            maxAge: 3600000         // Durata del cookie in millisecondi (1 ora)
        });

        return res.json({ success: true, message: "Autenticazione Google Riuscita!"});
    } catch (error) {
        console.error("Errore durante la verifica del token di Google: ", error);
        return res.status(401).json({ success: false, message: "Google token not valid or expired." });
    }
});

// ROTTA PROTETTA: salvataggio di un nuovo appuntamento (richiede login tramite authenticateToken)
app.post("/api/appointments", authenticateToken, async (req, res) => {
    try {
        const { title, date_time, amount } = req.body;  // Dati inviati dal frontend

        // Validazione: i campi obbligatori devono essere presenti
        if(!title || !date_time) {
            return res.status(400).json({ success: false, message: "Title and Time are mandatory."});
        }

        // MODIFICA: validazione lato server dell'importo (non ci fidiamo del frontend)
        const safeAmount = (amount === undefined || amount === null || isNaN(amount) || amount < 0) ? 0 : amount;

        // Recuperiamo l'id utente decodificato dal JWT dal middleware, non dal frontend (più sicuro)
        const userId = req.user.userId;

        // Inserimento con query parametrizzata per prevenire la SQL Injection
        const insertQuery = `
        INSERT INTO appointments (user_id, title, date_time, amount)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `;

        const result = await pool.query(insertQuery, [userId, title, date_time, safeAmount]);
        const newappointmentId = result.rows[0].id;

        console.log(`DATA BASE OK -> Nuovo appuntamento salvato per utente ${userId} con ID: ${newappointmentId}`);

        return res.status(201).json({
            success: true,
            message: "Appuntamento programmato con successo!",
            appointmentId: newappointmentId
        });
    } catch (error) {
        console.error("Errore durante il salvataggio dell'appuntamento:", error);
        return res.status(500).json({ success: false, message: "Errore interno del server."});
    }
});

// ROTTA PROTETTA: recupero degli appuntamenti del solo utente loggato
app.get("/api/appointments", authenticateToken, async (req, res) => {
    try {
        // Id utente preso dal JWT
        const userId = req.user.userId;

       // WHERE user_id = $1 garantisce che ogni utente veda SOLO i propri appuntamenti
       const selectQuery = `
       SELECT id, title, status, amount, to_char(date_time, 'YYYY-MM-DD HH24:MI') as date_time
       FROM appointments
       WHERE user_id = $1
       ORDER BY date_time ASC
       `;

       const result = await pool.query(selectQuery, [userId]);

       return res.json({
        success: true,
        appointments: result.rows
       });

    } catch(error) {
        console.error("Errore durante il recupero degli appuntamenti: ", error);
        return res.status(500).json({ success: false, message: "Errore interno del server."});
    }
});

// ROTTA PROTETTA: conta gli appuntamenti dell'utente (usata dalle statistiche della dashboard)
app.get("/api/appointments/count", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM appointments
            WHERE user_id = $1
        `;

        const result = await pool.query(countQuery, [userId]);

        // PostgreSQL restituisce il conteggio come stringa: lo convertiamo in numero
        const totalBookings = parseInt(result.rows[0].total, 10);

        return res.json({
            success: true,
            count: totalBookings
        });
    } catch (error) {
        console.error("Errore durante il conteggio degli appuntamenti: ", error);
        return res.status(500).json({ success: false, message: "Errore interno del server."});
    }
})

// ROTTA PROTETTA: somma reale degli importi degli appuntamenti (usata dalla dashboard)
app.get("/api/appointments/revenue", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const revenueQuery = `
            SELECT COALESCE(SUM(amount), 0) as total
            FROM appointments
            WHERE user_id = $1 AND status = 'paid'
        `;

        const result = await pool.query(revenueQuery, [userId]);

        // PostgreSQL restituisce SUM come stringa: la convertiamo in numero
        const totalRevenue = parseFloat(result.rows[0].total);

        return res.json({
            success: true,
            revenue: totalRevenue
        });
    } catch (error) {
        console.error("Errore durante il calcolo delle entrate: ", error);
        return res.status(500).json({ success: false, message: "Errore interno del server." });
    }
});

// ROTTA PROTETTA: statistiche mensili per il grafico della dashboard
app.get("/api/analytics", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const analyticsQuery = `
            SELECT 
                to_char(date_time, 'YYYY-MM') as month,
                status,
                COUNT(*) as total
            FROM appointments
            WHERE user_id = $1
            GROUP BY month, status
            ORDER BY month ASC
        `;

        const result = await pool.query(analyticsQuery, [userId]);

        return res.json({
            success: true,
            monthly: result.rows
        });
    } catch (error) {
        console.error("Errore durante il calcolo delle statistiche: ", error);
        return res.status(500).json({ success: false, message: "Errore interno del server." });
    }
});

// ROTTA PROTETTA: genera ed esporta un report CSV degli appuntamenti, usando un worker separato
app.get("/api/appointments/export", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Prendiamo prima i dati dal database (query veloce, resta nel thread principale)
        const selectQuery = `
            SELECT title, status, amount, to_char(date_time, 'YYYY-MM-DD HH24:MI') as date_time
            FROM appointments
            WHERE user_id = $1
            ORDER BY date_time ASC
        `;
        const result = await pool.query(selectQuery, [userId]);
        const appointments = result.rows;

        // Creiamo il worker, passandogli gli appuntamenti come workerData
        const worker = new Worker(
            path.join(__dirname, "report-worker.js"),
            { workerData: appointments }
        );

        // Quando il worker ha finito e manda il risultato, lo inviamo al browser come file
        worker.on("message", (data) => {
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment; filename=report.csv");
            return res.send(data.csv);
        });

        // Se il worker va in errore, rispondiamo con un errore gestito invece di far crashare il server
        worker.on("error", (error) => {
            console.error("Errore nel worker:", error);
            return res.status(500).json({ success: false, message: "Errore durante la generazione del report." });
        });

        // Se il client chiude la connessione prima che il worker finisca, lo terminiamo per non sprecare risorse
        req.on("close", () => {
            worker.terminate();
        });

    } catch (error) {
        console.error("Errore durante l'esportazione:", error);
        return res.status(500).json({ success: false, message: "Errore interno del server." });
    }
});

// ROTTA PROTETTA: restituisce l'email dell'utente corrente, letta dal JWT (usata nella sidebar)
app.get('/api/current-user-email', authenticateToken, (req, res) => {
    return res.json({
        success: true,
        email: req.user.email
    });
});

// ROTTA PROTETTA: aggiornamento dello stato di pagamento (paid/pending) di un appuntamento
app.patch("/api/appointments/:id/status", authenticateToken, async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const userId = req.user.userId;
        const { status } = req.body;

        // Accettiamo solo i due valori previsti: difesa contro dati non validi
        if (status !== 'paid' && status !== 'pending') {
            return res.status(400).json({ success: false, message: "Invalid status value." });
        }

        // AND user_id = $3 impedisce di modificare gli appuntamenti di altri utenti
        const updateQuery = `
            UPDATE appointments
            SET status = $1
            WHERE id = $2 AND user_id = $3
        `;

        const result = await pool.query(updateQuery, [status, appointmentId, userId]);

        // rowCount = 0 significa che l'appuntamento non esiste o non appartiene all'utente
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found or unauthorized." });
        }

        return res.json({ success: true, message: "Status updated." });
    } catch (error) {
        console.error("Errore durante l'aggiornamento dello stato:", error);
        return res.status(500).json({ success: false, message: "Errore interno del server." });
    }
});

// ROTTA PROTETTA: eliminazione di un appuntamento
app.delete("/api/appointments/:id", authenticateToken, async (req, res) => {
    try {
        const appointmentId = req.params.id;    // Id preso dall'URL dinamico (:id)
        const userId = req.user.userId;     // Id dell'utente loggato, preso dal JWT

        // Sicurezza: si elimina SOLO se l'appuntamento appartiene all'utente loggato
        const deleteQuery = `
            DELETE FROM appointments
            WHERE id = $1 AND user_id = $2
        `;

        const result = await pool.query(deleteQuery, [appointmentId, userId]);

        // rowCount = 0: l'appuntamento non esiste o non appartiene a questo utente
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found or unauthorized."});
        }

        console.log(`DATABASE OK -> Eliminato appuntamento ID: ${appointmentId} per utente ${userId}`);
        return res.json({ success: true, message: "Appointment deleted successfully." });
    } catch(error) {
        console.error("Errore durante l'eliminazione dell'appuntamento:", error);
        res.status(500).json({ success: false, message: "Errore interno del server."});
    }
});

// ROTTA PUBBLICA: riceve le prenotazioni dei clienti esterni (NON richiede login)
app.post('/api/public/book', async (req, res) => {
    try {
        const { freelanceEmail, clientName, clientEmail, bookingReason, date_time } = req.body;

        if (!freelanceEmail || !clientName || !clientEmail || !bookingReason || !date_time) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // Verifichiamo che il freelance destinatario della prenotazione esista davvero
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [freelanceEmail]);

         if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

         const freelancerId = userCheck.rows[0].id;

        // Inseriamo l'appuntamento usando i 3 campi standard della tabella appointments
        const insertQuery = `
            INSERT INTO appointments (user_id, title, date_time)
            VALUES ($1, $2, $3)
            RETURNING id
        `;

        // Uniamo i dati del cliente nel titolo dell'appuntamento
        const appointmentTitle = `${bookingReason} | Client: ${clientName} (${clientEmail})`;

        await pool.query(insertQuery, [freelancerId, appointmentTitle, date_time]);

        console.log(`PUBLIC BOOKING OK -> Nuovo appuntamento inserito per l'email: ${freelanceEmail}`);

        return res.status(201).json({
            success: true,
            message: "Appointment successfully booked!"
        });

    } catch (error) {
        console.error("Errore durante la prenotazione pubblica:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// MIDDLEWARE DI AUTENTICAZIONE: protegge le rotte verificando il JWT prima di eseguirle
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    // Distinguiamo se la richiesta arriva da una fetch() (rotta API) o dal caricamento di una pagina nel browser
    const isApiRoute = req.path.startsWith('/api/');

    if(!token) {
        // Senza token: alle API rispondiamo con JSON, al browser con un redirect al login
        // (fetch si aspetta JSON e non sa gestire i redirect HTML)
        if(isApiRoute) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please log in."});
        } else {
            return res.redirect("/login.html");
        }
    }

    try {
        // jwt.verify controlla la firma: se il token è stato manomesso, lancia un errore
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;     // Rendiamo disponibili i dati dell'utente alle rotte successive
        next();     // Token valido: passiamo alla rotta vera e propria
    } catch (err) {
        // Token alterato o scaduto: cancelliamo il cookie e rimandiamo al login
        res.clearCookie("token");
        return res.redirect("/login.html");
    }
}

    // GUARDIA SULLA CARTELLA PRIVATE: ogni file dentro /private è accessibile solo dopo la verifica del token
    app.use("/private", authenticateToken, express.static(path.join(__dirname, 'private')));

    // ROTTA DI LOGOUT: cancella il cookie del token dal browser
    app.post("/api/logout", (req, res ) => {
        res.clearCookie("token");

        return res.json({
            success: true,
            message: "Logout successful!"
        });
    });

    // Unknown API routes → JSON 404
    app.use('/api', (req, res) => {
        res.status(404).json({ message: "Endpoint not found." });
    });

    // Everything else → signup page
    app.use((req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'signup.html'));
    });

    // Avvio del server sulla porta definita
    app.listen(PORT, () => {
        console.log(`Server is running and listening on http://localhost:${PORT}`);
    });