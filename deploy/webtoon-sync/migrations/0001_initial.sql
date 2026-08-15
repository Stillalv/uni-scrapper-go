CREATE TABLE IF NOT EXISTS devices (
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  name TEXT,
  platform TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (user_id, device_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id TEXT NOT NULL,
  bookmark_id TEXT NOT NULL,
  device_id TEXT,
  title TEXT,
  url TEXT,
  thumbnail_url TEXT,
  chapter_id TEXT,
  chapter_title TEXT,
  progress REAL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, bookmark_id)
);

CREATE TABLE IF NOT EXISTS download_history (
  user_id TEXT NOT NULL,
  history_id TEXT NOT NULL,
  device_id TEXT,
  title TEXT,
  url TEXT,
  thumbnail_url TEXT,
  chapter_id TEXT,
  chapter_title TEXT,
  downloaded_at TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, history_id)
);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT NOT NULL,
  "key" TEXT NOT NULL,
  device_id TEXT NOT NULL DEFAULT '',
  value_json TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, "key", device_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_updated
  ON bookmarks (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_history_user_updated
  ON download_history (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_settings_user_updated
  ON settings (user_id, updated_at);
