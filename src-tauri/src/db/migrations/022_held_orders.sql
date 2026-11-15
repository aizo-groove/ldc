-- ============================================================
-- NOTES EN ATTENTE
-- ============================================================
-- Une note en attente est un ticket ouvert sans table (table_id NULL) :
-- panier de la Vente mis de côté pour être repris plus tard.
-- held_no : numéro du jour, attribué à la création (#1, #2…).
-- label   : libellé libre facultatif (« Comptoir », « À emporter »…).
-- ============================================================

ALTER TABLE open_orders ADD COLUMN held_no INTEGER;
ALTER TABLE open_orders ADD COLUMN label   TEXT;
