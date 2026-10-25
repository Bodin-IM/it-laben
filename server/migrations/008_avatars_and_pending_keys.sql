ALTER TABLE lab_profiles ADD COLUMN avatar_id TEXT NOT NULL DEFAULT 'robot';

-- Prepared keys cannot log in until their downloaded file is confirmed.
CREATE TABLE pending_recovery_keys (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX pending_keys_user ON pending_recovery_keys(user_id);
