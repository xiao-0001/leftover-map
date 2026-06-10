CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dorm_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  image_data_url TEXT,
  expires_at TEXT NOT NULL,
  contact TEXT NOT NULL,
  claimed INTEGER NOT NULL DEFAULT 0,
  claimer_name TEXT,
  claimer_contact TEXT,
  claimed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_dorm ON items(dorm_id);
CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at);
