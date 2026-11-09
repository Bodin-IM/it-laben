CREATE TABLE vlan_pings (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES vlan_rooms(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES vlan_members(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  payload TEXT NOT NULL,
  UNIQUE(room_id, member_id, request_id)
);
CREATE INDEX vlan_pings_room_expiry ON vlan_pings(room_id, expires_at);
