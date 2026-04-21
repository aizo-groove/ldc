-- ============================================================
-- CATALOGUE : catégories et produits
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name       TEXT    NOT NULL,
    color      TEXT,
    icon       TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS products (
    id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    category_id TEXT    REFERENCES categories(id) ON DELETE SET NULL,
    name        TEXT    NOT NULL,
    description TEXT,
    barcode     TEXT    UNIQUE,
    sku         TEXT    UNIQUE,

    -- Prix TTC en centimes (prix affiché consommateur)
    price_ttc   INTEGER NOT NULL CHECK (price_ttc >= 0),
    tva_rate_id INTEGER NOT NULL REFERENCES tva_rates(id),
    -- Prix HT : price_ht = round(price_ttc * 10000 / (10000 + rate_pct))
    -- Stocké pour éviter de recalculer à chaque transaction.
    price_ht    INTEGER NOT NULL CHECK (price_ht >= 0),

    track_stock INTEGER NOT NULL DEFAULT 0 CHECK (track_stock IN (0, 1)),
    stock_qty   INTEGER,

    active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_products_barcode  ON products(barcode)      WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(active);
