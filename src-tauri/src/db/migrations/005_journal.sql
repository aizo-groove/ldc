-- ============================================================
-- JOURNAL D'AUDIT (NF525 §5)
-- ============================================================
-- APPEND ONLY — trace de tous les événements système significatifs.

CREATE TABLE IF NOT EXISTS journal_entries (
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
        'SYNC_ERROR'
    )),

    entity_type TEXT,   -- 'transaction' | 'session' | 'cloture' | …
    entity_id   TEXT,

    -- Snapshot JSON de l'événement au moment où il se produit
    payload TEXT,

    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    UNIQUE(sequence_no)
);

CREATE INDEX IF NOT EXISTS idx_journal_event  ON journal_entries(event_type);
CREATE INDEX IF NOT EXISTS idx_journal_date   ON journal_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_journal_entity ON journal_entries(entity_type, entity_id);
