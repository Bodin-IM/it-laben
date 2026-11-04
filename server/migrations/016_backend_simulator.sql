CREATE TABLE simulator_rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  paused INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE simulator_players (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES simulator_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  data TEXT NOT NULL,
  get_path TEXT,
  post_path TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL,
  fetched INTEGER NOT NULL DEFAULT 0,
  shown INTEGER NOT NULL DEFAULT 0,
  posted INTEGER NOT NULL DEFAULT 0,
  display TEXT,
  UNIQUE(room_id, user_id)
);
CREATE TABLE simulator_events (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES simulator_rooms(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES simulator_players(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(actor_id, request_id)
);
CREATE INDEX simulator_events_room ON simulator_events(room_id, created_at);
CREATE INDEX simulator_players_user ON simulator_players(user_id);
