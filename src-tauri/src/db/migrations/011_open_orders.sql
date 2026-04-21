-- Tickets ouverts (en cours, non encore encaissés)
-- Un ticket par table maximum. Supprimé dès le paiement validé.

CREATE TABLE IF NOT EXISTS open_orders (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    table_id   TEXT REFERENCES restaurant_tables(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES sessions(id),
    note       TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(table_id)
);

CREATE TABLE IF NOT EXISTS open_order_lines (
    id             TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    order_id       TEXT    NOT NULL REFERENCES open_orders(id) ON DELETE CASCADE,
    line_no        INTEGER NOT NULL,
    product_id     TEXT,
    product_name   TEXT    NOT NULL,
    product_sku    TEXT,
    quantity       INTEGER NOT NULL DEFAULT 1,
    unit_price_ttc INTEGER NOT NULL,
    unit_price_ht  INTEGER NOT NULL,
    tva_rate_pct   INTEGER NOT NULL,
    discount_ttc   INTEGER NOT NULL DEFAULT 0,
    UNIQUE(order_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_open_orders_table   ON open_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_open_order_lines_order ON open_order_lines(order_id);
