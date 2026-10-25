CREATE TABLE user_roles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role='teacher'),
  granted_at INTEGER NOT NULL
);
CREATE TABLE activity_openings (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('practice','teaching')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  closes_at INTEGER NOT NULL,
  closed_at INTEGER,
  closed_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX opening_activity ON activity_openings(activity_id,closes_at);
CREATE TABLE teacher_actions (
  id INTEGER PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
ALTER TABLE checkpoint_attempts ADD COLUMN opening_id TEXT REFERENCES activity_openings(id);
DROP INDEX checkpoint_pending;
CREATE UNIQUE INDEX checkpoint_pending ON checkpoint_attempts(user_id,activity_id,objective_id,COALESCE(opening_id,'')) WHERE submitted_at IS NULL;
ALTER TABLE timed_attempts ADD COLUMN opening_id TEXT REFERENCES activity_openings(id);
DROP INDEX timed_active;
CREATE UNIQUE INDEX timed_active ON timed_attempts(user_id,activity_id,COALESCE(opening_id,'')) WHERE status='active';
CREATE TABLE practice_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  objective_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('check','timed')),
  opening_id TEXT REFERENCES activity_openings(id),
  start_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deadline_at INTEGER,
  status TEXT NOT NULL CHECK (status IN ('active','passed','failed','expired','abandoned')),
  snapshot_json TEXT NOT NULL,
  draft_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 0,
  final_json TEXT,
  result_json TEXT,
  ended_at INTEGER,
  UNIQUE(user_id,activity_id,objective_id,start_key)
);
CREATE UNIQUE INDEX practice_active ON practice_runs(user_id,activity_id,objective_id) WHERE status='active';
CREATE INDEX practice_history ON practice_runs(user_id,activity_id,created_at DESC);
CREATE TABLE practice_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  objective_id TEXT NOT NULL,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL,
  solution_json TEXT,
  PRIMARY KEY(user_id,activity_id,objective_id)
);
CREATE TABLE practice_receipts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,event_id)
);
