-- ============================================================
-- FOUNDATION : configuration, versions logicielle, taux TVA
-- ============================================================
-- RÈGLE : tous les montants monétaires sont stockés en centimes (INTEGER).
-- €12.50 → 1250 | Jamais de REAL/FLOAT pour des montants fiscaux.
-- ============================================================

CREATE TABLE IF NOT EXISTS config (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO config (key, value) VALUES
    ('business.name',       NULL),
    ('business.siret',      NULL),
    ('business.address',    NULL),
    ('business.vat_number', NULL),
    ('install.id',          lower(hex(randomblob(16)))),
    ('install.created_at',  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ('sync.enabled',        '0'),
    ('sync.subscription_key', NULL);

-- NF525 §3.4 : toute modification du logiciel doit être tracée.
-- APPEND ONLY — aucune ligne ne doit jamais être modifiée.
CREATE TABLE IF NOT EXISTS software_versions (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    version      TEXT NOT NULL,
    activated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    note         TEXT
);

INSERT OR IGNORE INTO software_versions (version, note)
    VALUES ('0.1.0', 'Installation initiale');

-- Taux légaux français. rate_pct en centièmes de % : 20% → 2000.
CREATE TABLE IF NOT EXISTS tva_rates (
    id       INTEGER PRIMARY KEY,
    label    TEXT    NOT NULL,
    rate_pct INTEGER NOT NULL,
    active   INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    UNIQUE(rate_pct)
);

INSERT OR IGNORE INTO tva_rates (id, label, rate_pct) VALUES
    (1, 'Taux normal',        2000),
    (2, 'Taux intermédiaire', 1000),
    (3, 'Taux réduit',         550),
    (4, 'Taux super-réduit',   210),
    (5, 'Exonéré',               0);
