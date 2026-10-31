-- Separate from self-service keys: preparation belongs to one administrator and pupil.
-- Only verifiers are stored; preparing a replacement never changes active credentials.
CREATE TABLE pending_admin_recovery_keys (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  keyset_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX admin_recovery_expiry ON pending_admin_recovery_keys(expires_at);
