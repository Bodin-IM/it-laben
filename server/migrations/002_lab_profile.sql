CREATE TABLE lab_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  color_id TEXT NOT NULL DEFAULT 'forest',
  featured_achievement_id TEXT
);
