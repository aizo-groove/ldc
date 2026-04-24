-- ============================================================
-- Remplace le catalogue de démo dev (12 articles) par 3 articles
-- propres pour les nouvelles installations.
-- Les DELETEs sont idempotents (no-op si déjà supprimés).
-- Les INSERTs sont conditionnels : ne s'exécutent que si le
-- catalogue est vide après le nettoyage, pour ne pas toucher
-- aux données réelles des utilisateurs existants.
-- ============================================================

DELETE FROM products  WHERE id IN ('p-1','p-2','p-3','p-4','p-5','p-6','p-7','p-8','p-9','p-10','p-11','p-12','p-13');
DELETE FROM categories WHERE id IN ('cat-1','cat-2','cat-3','cat-4','cat-5');

-- Catégories de démonstration (seulement si catalogue vide)
INSERT INTO categories (id, name, color, sort_order)
SELECT 'demo-boissons', 'Boissons', '#b4c5ff', 0
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);

INSERT INTO categories (id, name, color, sort_order)
SELECT 'demo-plats', 'Plats', '#4ae176', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE id != 'demo-boissons');

-- 3 articles de démonstration (seulement si catalogue vide)
-- tva_rate_id : 2 = TVA 10% | 3 = TVA 5.5% | 1 = TVA 20%
-- price_ht = ROUND(price_ttc * 10000 / (10000 + rate_pct))
INSERT INTO products (id, category_id, name, sku, price_ttc, tva_rate_id, price_ht, sort_order)
SELECT 'demo-cafe', 'demo-boissons', 'Café', 'DEMO001', 200, 2, 182, 0
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

INSERT INTO products (id, category_id, name, sku, price_ttc, tva_rate_id, price_ht, sort_order)
SELECT 'demo-eau', 'demo-boissons', 'Eau minérale 50cl', 'DEMO002', 150, 2, 136, 1
WHERE (SELECT COUNT(*) FROM products WHERE id NOT IN ('demo-cafe')) = 0
  AND EXISTS (SELECT 1 FROM products WHERE id = 'demo-cafe');

INSERT INTO products (id, category_id, name, sku, price_ttc, tva_rate_id, price_ht, sort_order)
SELECT 'demo-formule', 'demo-plats', 'Formule du jour', 'DEMO003', 1200, 2, 1091, 0
WHERE (SELECT COUNT(*) FROM products WHERE id NOT IN ('demo-cafe','demo-eau')) = 0
  AND EXISTS (SELECT 1 FROM products WHERE id = 'demo-cafe');
