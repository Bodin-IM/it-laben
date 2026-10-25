CREATE TABLE checkpoint_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  objective_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  issued_at INTEGER NOT NULL,
  submitted_at INTEGER,
  questions_json TEXT NOT NULL,
  answers_json TEXT,
  score INTEGER,
  passed INTEGER CHECK (passed IN (0,1)),
  UNIQUE(user_id, activity_id, objective_id, sequence)
);
CREATE UNIQUE INDEX checkpoint_pending
  ON checkpoint_attempts(user_id, activity_id, objective_id)
  WHERE submitted_at IS NULL;
CREATE INDEX checkpoint_submitted
  ON checkpoint_attempts(user_id, activity_id, objective_id, submitted_at);
