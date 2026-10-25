CREATE TABLE timed_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  start_key TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  deadline_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','passed','failed','expired')),
  scenario_json TEXT NOT NULL,
  draft_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 0,
  final_answers_json TEXT,
  ended_at INTEGER,
  report_json TEXT,
  UNIQUE(user_id, activity_id, start_key)
);
CREATE UNIQUE INDEX timed_active ON timed_attempts(user_id, activity_id) WHERE status='active';
CREATE INDEX timed_history ON timed_attempts(user_id, activity_id, started_at DESC);
