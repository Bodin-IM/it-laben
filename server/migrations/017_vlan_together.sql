CREATE TABLE vlan_rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  paused INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE vlan_members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES vlan_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen INTEGER NOT NULL,
  UNIQUE(room_id, user_id)
);
CREATE INDEX vlan_members_user ON vlan_members(user_id);
CREATE TABLE vlan_commands (
  room_id TEXT NOT NULL REFERENCES vlan_rooms(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES vlan_members(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  PRIMARY KEY(room_id, member_id, request_id)
);
