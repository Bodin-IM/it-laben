ALTER TABLE users ADD COLUMN name_assigned INTEGER NOT NULL DEFAULT 0 CHECK (name_assigned IN (0,1));
ALTER TABLE users ADD COLUMN disabled_at INTEGER;
ALTER TABLE users ADD COLUMN leaderboard_visible INTEGER NOT NULL DEFAULT 0 CHECK (leaderboard_visible IN (0,1));
-- Legacy names may collide. The API assigns them once before serving requests.
CREATE UNIQUE INDEX assigned_username ON users(nickname COLLATE NOCASE) WHERE name_assigned=1;
CREATE INDEX username_lookup ON users(nickname COLLATE NOCASE);

ALTER TABLE user_roles RENAME TO previous_user_roles;
CREATE TABLE user_roles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('teacher','admin')),
  granted_at INTEGER NOT NULL
);
INSERT INTO user_roles SELECT * FROM previous_user_roles;
DROP TABLE previous_user_roles;

CREATE TABLE management_actions (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  target_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX management_target ON management_actions(target_id,created_at);
CREATE INDEX student_visibility ON users(disabled_at,leaderboard_visible);
