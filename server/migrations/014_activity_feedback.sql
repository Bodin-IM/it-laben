CREATE TABLE feedback_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prompts_enabled INTEGER NOT NULL DEFAULT 1 CHECK(prompts_enabled IN (0,1))
);

CREATE TABLE activity_feedback_prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  activity_version TEXT NOT NULL,
  activity_title TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  page_href TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK(trigger IN ('run-finished','left-activity')),
  school_day TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  answer TEXT CHECK(answer IN ('yes','partly','no')),
  answered_at INTEGER,
  dismissed_at INTEGER,
  UNIQUE(user_id,school_day),
  UNIQUE(user_id,activity_id,activity_version)
);
CREATE INDEX activity_feedback_summary ON activity_feedback_prompts(activity_id,activity_version,question_id);
ALTER TABLE student_feedback ADD COLUMN prompt_id TEXT REFERENCES activity_feedback_prompts(id) ON DELETE CASCADE;
CREATE INDEX student_feedback_prompt ON student_feedback(prompt_id);
