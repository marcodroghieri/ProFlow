-- TABELLA GESTIONE UTENTI
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255)
);

-- TABELLA GESTIONE APPUNTAMENTI
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    date_time TIMESTAMP NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending')),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- MODIFICA: aggiunta colonna per l'importo reale di ogni appuntamento
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0;
