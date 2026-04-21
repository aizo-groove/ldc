-- ============================================================
-- SEED DEV : données de démonstration
-- INSERT OR IGNORE → idempotent, ne plante pas si déjà présent.
-- price_ht = ROUND(price_ttc * 10000 / (10000 + rate_pct))
-- ============================================================

INSERT OR IGNORE INTO categories (id, name, color, sort_order) VALUES
    ('cat-1', 'Boissons',     '#b4c5ff', 0),
    ('cat-2', 'Viennoiserie', '#ffb3ad', 1),
    ('cat-3', 'Snacks',       '#4ae176', 2),
    ('cat-4', 'Alimentation', '#8d90a0', 3),
    ('cat-5', 'Desserts',     '#ffb3ad', 4);

-- tva_rate_id : 1=20% | 2=10% | 3=5.5% | 4=2.1% | 5=0%
INSERT OR IGNORE INTO products
    (id, category_id, name, description, sku, price_ttc, tva_rate_id, price_ht, track_stock, stock_qty, sort_order)
VALUES
    -- Boissons (TVA 10% sauf bières à 20%)
    ('p-1',  'cat-1', 'Expresso',            'Simple / Double',   '00101',  180, 2,  164, 0, NULL, 0),
    ('p-2',  'cat-1', 'Cappuccino',          'Mousse de lait',    '00102',  390, 2,  355, 0, NULL, 1),
    ('p-3',  'cat-1', 'Café Latte Grande',   'Sans sucre',        '00921',  450, 2,  409, 0, NULL, 2),
    ('p-4',  'cat-1', 'Eau Minérale',        '50cl Plate',        '00201',  150, 1,  125, 0, NULL, 3),
    ('p-5',  'cat-1', 'Smoothie',            'Fruits Frais',      '00301',  550, 2,  500, 0, NULL, 4),
    ('p-11', 'cat-1', 'IPA Artisanale 33cl', NULL,                '00422',  680, 1,  567, 1,   30, 5),

    -- Viennoiserie (TVA 5.5%)
    ('p-6',  'cat-2', 'Croissant Pur Beurre', NULL,              '00412',  180, 3,  171, 0, NULL, 0),
    ('p-7',  'cat-2', 'Pain Chocolat',         'Double barre',   '00413',  210, 3,  199, 0, NULL, 1),

    -- Snacks (TVA 10%)
    ('p-8',  'cat-3', 'Cookie Choc Noir',  NULL,          '01104',  220, 2,  200, 0, NULL, 0),
    ('p-9',  'cat-3', 'Muffin Myrtille',   'Cœur fondant','01105',  320, 2,  291, 0, NULL, 1),

    -- Alimentation (TVA 10%, stock suivi)
    ('p-10', 'cat-4', 'Burger Classique XL', NULL,         '00421', 1450, 2, 1318, 1,   14, 0),
    ('p-13', 'cat-4', 'Pizza Margherita',    NULL,         '00435', 1100, 2, 1000, 1,    8, 1),

    -- Desserts (TVA 5.5%, rupture de stock pour tester le badge)
    ('p-12', 'cat-5', 'Brownie Maison', NULL,              '00425',  450, 3,  427, 1,    0, 0);
