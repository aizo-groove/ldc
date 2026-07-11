CREATE TABLE IF NOT EXISTS printers (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  printer_type TEXT NOT NULL DEFAULT 'thermal_tcp', -- 'thermal_tcp' | 'screen'
  ip           TEXT,
  port         INTEGER NOT NULL DEFAULT 9100,
  paper_mm     INTEGER NOT NULL DEFAULT 80,
  roles        TEXT NOT NULL DEFAULT 'receipt',     -- 'receipt' | 'kitchen' | 'receipt,kitchen'
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
