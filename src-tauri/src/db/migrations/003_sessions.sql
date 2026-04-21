-- ============================================================
-- SESSIONS DE CAISSE ET CLÔTURES Z (NF525)
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    status         TEXT NOT NULL DEFAULT 'OPEN'
                       CHECK (status IN ('OPEN', 'CLOSED')),
    opening_float  INTEGER NOT NULL DEFAULT 0,
    opening_note   TEXT,
    opened_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    closed_at      TEXT,
    cloture_id     TEXT
);

-- NF525 §4 : la clôture est un acte fiscal irréversible.
-- APPEND ONLY — aucune modification autorisée.
CREATE TABLE IF NOT EXISTS clotures (
    id            TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id    TEXT    NOT NULL REFERENCES sessions(id),
    sequence_no   INTEGER NOT NULL,

    -- Totaux de la session (centimes)
    total_ventes_ttc      INTEGER NOT NULL DEFAULT 0,
    total_avoirs_ttc      INTEGER NOT NULL DEFAULT 0,
    total_annulations_ttc INTEGER NOT NULL DEFAULT 0,
    net_ttc               INTEGER NOT NULL DEFAULT 0,

    -- TVA collectée par taux
    tva_2000 INTEGER NOT NULL DEFAULT 0,
    tva_1000 INTEGER NOT NULL DEFAULT 0,
    tva_550  INTEGER NOT NULL DEFAULT 0,
    tva_210  INTEGER NOT NULL DEFAULT 0,
    tva_0    INTEGER NOT NULL DEFAULT 0,

    -- Par moyen de paiement
    pay_especes INTEGER NOT NULL DEFAULT 0,
    pay_cb      INTEGER NOT NULL DEFAULT 0,
    pay_cheque  INTEGER NOT NULL DEFAULT 0,
    pay_autre   INTEGER NOT NULL DEFAULT 0,

    -- NF525 : chaîne de hachage des clôtures
    -- hash = SHA256( canonical_json(cloture) || previous_hash )
    previous_hash TEXT,
    hash          TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    UNIQUE(sequence_no)
);

-- NF525 §4.3 : grands totaux perpétuels, jamais remis à zéro.
-- Un enregistrement par clôture. APPEND ONLY.
CREATE TABLE IF NOT EXISTS grand_totals (
    id            TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    cloture_id    TEXT    NOT NULL UNIQUE REFERENCES clotures(id),

    gt_ventes_ttc INTEGER NOT NULL,
    gt_avoirs_ttc INTEGER NOT NULL,
    gt_net_ttc    INTEGER NOT NULL,

    gt_tva_2000   INTEGER NOT NULL,
    gt_tva_1000   INTEGER NOT NULL,
    gt_tva_550    INTEGER NOT NULL,
    gt_tva_210    INTEGER NOT NULL,
    gt_tva_0      INTEGER NOT NULL,

    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
