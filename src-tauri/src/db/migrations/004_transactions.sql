-- ============================================================
-- TRANSACTIONS (CŒUR NF525)
-- ============================================================
-- APPEND ONLY — aucune ligne ne doit jamais être modifiée ni supprimée.
-- Les corrections passent par des transactions de type AVOIR ou ANNULATION.
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id  TEXT    NOT NULL REFERENCES sessions(id),

    -- NF525 §3.2 : numéro séquentiel unique, sans trou, sans réutilisation.
    sequence_no INTEGER NOT NULL,

    type TEXT NOT NULL CHECK (type IN (
        'VENTE',       -- vente normale
        'AVOIR',       -- remboursement après clôture
        'ANNULATION'   -- annulation dans la même session
    )),

    -- Référence à la transaction d'origine pour AVOIR / ANNULATION
    ref_transaction_id TEXT REFERENCES transactions(id),

    -- Totaux en centimes
    total_ht  INTEGER NOT NULL,
    total_tva INTEGER NOT NULL,
    total_ttc INTEGER NOT NULL,   -- invariant : total_ttc = total_ht + total_tva
    discount_ttc INTEGER NOT NULL DEFAULT 0,

    -- NF525 : chaîne de hachage
    -- Payload canonique : sequence_no || type || total_ttc || created_at || previous_hash
    -- Format défini dans nf525/chain.rs — NE PAS changer sans bump de version.
    previous_hash TEXT,           -- NULL uniquement pour la toute première transaction
    hash          TEXT NOT NULL UNIQUE,

    receipt_printed INTEGER NOT NULL DEFAULT 0 CHECK (receipt_printed IN (0, 1)),
    receipt_email   TEXT,

    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    UNIQUE(sequence_no)
);

-- ============================================================
-- LIGNES DE TRANSACTION
-- ============================================================

CREATE TABLE IF NOT EXISTS transaction_lines (
    id             TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    transaction_id TEXT    NOT NULL REFERENCES transactions(id),
    line_no        INTEGER NOT NULL,

    product_id   TEXT REFERENCES products(id) ON DELETE SET NULL,
    -- Snapshot au moment de la vente — indépendant des modifications futures du catalogue.
    product_name TEXT    NOT NULL,
    product_sku  TEXT,

    quantity     INTEGER NOT NULL CHECK (quantity != 0),

    unit_price_ttc INTEGER NOT NULL,
    unit_price_ht  INTEGER NOT NULL,
    tva_rate_pct   INTEGER NOT NULL,   -- snapshot : 2000, 1000, 550, 210 ou 0

    discount_ttc   INTEGER NOT NULL DEFAULT 0,

    line_total_ht  INTEGER NOT NULL,
    line_total_tva INTEGER NOT NULL,
    line_total_ttc INTEGER NOT NULL,

    UNIQUE(transaction_id, line_no),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- ============================================================
-- PAIEMENTS
-- ============================================================
-- Plusieurs lignes possibles par transaction (paiement mixte).

CREATE TABLE IF NOT EXISTS payments (
    id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    transaction_id TEXT NOT NULL REFERENCES transactions(id),

    method TEXT NOT NULL CHECK (method IN (
        'ESPECES', 'CB', 'CHEQUE', 'VIREMENT', 'AVOIR', 'AUTRE'
    )),

    amount     INTEGER NOT NULL CHECK (amount > 0),
    cash_given INTEGER,   -- espèces uniquement
    cash_change INTEGER,  -- rendu monnaie

    reference  TEXT,      -- n° chèque, autorisation CB…

    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transactions_session ON transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type    ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_lines_transaction    ON transaction_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id);
