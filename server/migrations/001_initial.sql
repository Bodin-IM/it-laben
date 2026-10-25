CREATE TABLE users (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE recovery_keys (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE TABLE sessions (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  remembered INTEGER NOT NULL CHECK (remembered IN (0,1))
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  objective_id TEXT NOT NULL,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL,
  solution_json TEXT,
  PRIMARY KEY (user_id, activity_id, objective_id)
);
CREATE TABLE rewards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points > 0),
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, reward_key)
);
CREATE TABLE achievements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);
CREATE TABLE receipts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, event_id)
);
