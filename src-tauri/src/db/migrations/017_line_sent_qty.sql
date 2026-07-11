-- Track how many units of each line have been sent to the kitchen.
-- Enables delta printing (only new items since last send).
ALTER TABLE open_order_lines ADD COLUMN sent_qty INTEGER NOT NULL DEFAULT 0;
