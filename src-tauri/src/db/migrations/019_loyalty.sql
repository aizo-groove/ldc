-- Fido loyalty integration — config, programs, redemption queue, nonces

-- Credentials and feature flag for this installation
CREATE TABLE IF NOT EXISTS loyalty_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Keys: fido_mid, fido_partner_id, fido_partner_secret, fido_api_url, fido_enabled

-- Active loyalty program config (synced from/to Fido API)
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id         TEXT PRIMARY KEY,
    mid        TEXT NOT NULL,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('points','stamps','cashback','tiers','visits')),
    status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
    config     TEXT NOT NULL DEFAULT '{}',
    synced_at  TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Offline redemption queue — flushed on reconnect
CREATE TABLE IF NOT EXISTS loyalty_redemption_queue (
    id          TEXT PRIMARY KEY,
    nonce       TEXT NOT NULL UNIQUE,
    rct_payload TEXT NOT NULL,
    mid         TEXT NOT NULL,
    pos_id      TEXT,
    cashier_id  TEXT,
    local_ts    TEXT NOT NULL,
    max_sync_by TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending_sync'
        CHECK (status IN ('pending_sync','synced','voided'))
);

-- Nonce deduplication (7-day local retention)
CREATE TABLE IF NOT EXISTS loyalty_nonces (
    nonce        TEXT PRIMARY KEY,
    status       TEXT NOT NULL CHECK (status IN ('consumed','rejected')),
    processed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_loyalty_nonces_processed
    ON loyalty_nonces(processed_at);
