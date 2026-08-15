CREATE TABLE settings_v2 (
  user_id TEXT NOT NULL,
  "key" TEXT NOT NULL,
  device_id TEXT NOT NULL DEFAULT '',
  value_json TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, "key", device_id)
);

INSERT INTO settings_v2 (user_id, "key", device_id, value_json, payload_json, created_at, updated_at)
SELECT user_id, "key", COALESCE(device_id, ''), value_json, payload_json, created_at, updated_at
FROM settings;

DROP TABLE settings;
ALTER TABLE settings_v2 RENAME TO settings;

CREATE INDEX IF NOT EXISTS idx_settings_user_updated
  ON settings (user_id, updated_at);
