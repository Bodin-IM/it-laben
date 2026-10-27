-- Existing profiles keep their points and choose a class themselves.
ALTER TABLE users ADD COLUMN class_code TEXT CHECK (class_code IN ('2ITA', '2ITB'));
