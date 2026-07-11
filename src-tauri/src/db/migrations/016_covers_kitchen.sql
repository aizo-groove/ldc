-- Couverts et statut cuisine sur les commandes ouvertes
ALTER TABLE open_orders ADD COLUMN covers INTEGER NOT NULL DEFAULT 1;
ALTER TABLE open_orders ADD COLUMN sent_to_kitchen INTEGER NOT NULL DEFAULT 0;
