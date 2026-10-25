ALTER TABLE users ADD COLUMN leaderboard_preference_set INTEGER NOT NULL DEFAULT 0 CHECK (leaderboard_preference_set IN (0,1));
-- Existing dev profiles have already been assigned names and may have chosen to hide.
-- Preserve their previous setting. Accounts upgrading from the school version have
-- never had a leaderboard choice and get the new visible-by-default policy.
UPDATE users SET leaderboard_preference_set=1 WHERE name_assigned=1;
UPDATE users SET leaderboard_visible=1 WHERE leaderboard_preference_set=0;
