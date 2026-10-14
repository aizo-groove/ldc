-- ============================================================
-- DUPLICATAS (NF525)
-- ============================================================
-- Toute réédition d'un ticket est un duplicata : numéroté par ticket,
-- marqué « DUPLICATA » et tracé dans le journal. APPEND ONLY.
--
-- Le journal doit accepter le nouvel événement DUPLICATA. SQLite ne
-- permet pas de modifier une contrainte CHECK : on recrée la table
-- à l'identique (mêmes colonnes, même ordre) et on recopie les données.
-- ============================================================

CREATE TABLE journal_entries_new (
    id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    sequence_no INTEGER NOT NULL,

    event_type TEXT NOT NULL CHECK (event_type IN (
        'SESSION_OPEN',
        'SESSION_CLOSE',
        'TRANSACTION_CREATED',
        'CLOTURE_Z',
        'RAPPORT_X',
        'CONFIG_CHANGED',
        'SOFTWARE_UPDATED',
        'PRINTER_ERROR',
        'SYNC_SUCCESS',
        'SYNC_ERROR',
        'DUPLICATA'
    )),

    entity_type TEXT,
    entity_id   TEXT,
    payload     TEXT,

    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    UNIQUE(sequence_no)
);

INSERT INTO journal_entries_new SELECT * FROM journal_entries;

DROP TABLE journal_entries;

ALTER TABLE journal_entries_new RENAME TO journal_entries;

CREATE INDEX IF NOT EXISTS idx_journal_event  ON journal_entries(event_type);
CREATE INDEX IF NOT EXISTS idx_journal_date   ON journal_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_journal_entity ON journal_entries(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS duplicatas (
    id             TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    transaction_id TEXT    NOT NULL REFERENCES transactions(id),
    -- Numéro du duplicata pour ce ticket : 1, 2, 3…
    duplicata_no   INTEGER NOT NULL,
    -- Support de réédition
    canal TEXT NOT NULL CHECK (canal IN ('IMPRESSION', 'ECRAN', 'PDF', 'FIDO')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    UNIQUE(transaction_id, duplicata_no)
);

CREATE INDEX IF NOT EXISTS idx_duplicatas_transaction ON duplicatas(transaction_id);
