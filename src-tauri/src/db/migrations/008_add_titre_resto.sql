-- ============================================================
-- Ajout de TITRE_RESTO comme méthode de paiement autorisée.
--
-- SQLite ne supporte pas ALTER TABLE … MODIFY COLUMN pour changer
-- une contrainte CHECK. On doit recréer la table avec la nouvelle
-- liste, copier les données existantes, puis renommer.
-- ============================================================

PRAGMA foreign_keys = OFF;

CREATE TABLE payments_new (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    transaction_id TEXT NOT NULL REFERENCES transactions(id),

    method TEXT NOT NULL CHECK (method IN (
        'ESPECES', 'CB', 'CHEQUE', 'TITRE_RESTO', 'VIREMENT', 'AVOIR', 'AUTRE'
    )),

    amount      INTEGER NOT NULL CHECK (amount > 0),
    cash_given  INTEGER,
    cash_change INTEGER,
    reference   TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO payments_new SELECT * FROM payments;

DROP TABLE payments;

ALTER TABLE payments_new RENAME TO payments;

CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id);

PRAGMA foreign_keys = ON;
