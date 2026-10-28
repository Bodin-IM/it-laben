CREATE TABLE student_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN ('problem','idea','other')),
  message TEXT NOT NULL CHECK(length(message) BETWEEN 1 AND 2000),
  page_href TEXT NOT NULL,
  page_title TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','handled')),
  handled_at INTEGER
);
CREATE INDEX student_feedback_inbox ON student_feedback(status,created_at DESC,id);
CREATE INDEX student_feedback_author ON student_feedback(user_id,created_at DESC);
