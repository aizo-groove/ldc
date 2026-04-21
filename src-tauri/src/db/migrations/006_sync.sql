-- ============================================================
-- SYNC CLOUD (FONCTIONNALITÉ PAYANTE)
-- ============================================================
-- Tables créées même sans abonnement actif.
-- Activée par config 'sync.enabled' = '1'.
-- INSERT ONLY : NF525 interdit les UPDATE/DELETE sur les données fiscales.

CREATE TABLE IF NOT EXISTS sync_queue (
    id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entity_type TEXT    NOT NULL,
    entity_id   TEXT    NOT NULL,
    operation   TEXT    NOT NULL CHECK (operation IN ('INSERT')),
    payload     TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    attempts    INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT,
    synced_at   TEXT    -- NULL = en attente
);

CREATE TABLE IF NOT EXISTS sync_log (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    started_at   TEXT NOT NULL,
    finished_at  TEXT,
    status       TEXT NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL', 'ERROR')),
    items_synced INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_pending ON sync_queue(synced_at)
    WHERE synced_at IS NULL;
