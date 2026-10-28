CREATE TABLE module_publication (
  module_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('upcoming','active','completed')),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at INTEGER,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- Preserve the availability of existing modules. Later additions default to upcoming.
INSERT INTO module_publication(module_id,status) VALUES
  ('meldingens-reise','active'),
  ('data-og-lagring','active'),
  ('innlogging-og-tilgang','active'),
  ('fra-kode-til-drift','active');
