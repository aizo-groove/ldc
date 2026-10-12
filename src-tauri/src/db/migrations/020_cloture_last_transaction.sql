-- ============================================================
-- Clôture Z : ancrage sur la dernière transaction de la session.
-- Le hash de la clôture couvre ces deux valeurs : une transaction
-- ajoutée après coup à une session clôturée devient détectable.
-- NULL si la session ne contient aucune transaction.
-- ============================================================

ALTER TABLE clotures ADD COLUMN last_transaction_seq  INTEGER;
ALTER TABLE clotures ADD COLUMN last_transaction_hash TEXT;
