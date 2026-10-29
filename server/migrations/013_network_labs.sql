CREATE TABLE network_lab_passes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab_id TEXT NOT NULL CHECK(lab_id IN ('vlan-lab','vlan-lab-2')),
  task_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  passed_at INTEGER NOT NULL,
  PRIMARY KEY(user_id,lab_id,task_id,version)
);
