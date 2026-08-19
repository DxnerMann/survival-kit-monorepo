CREATE TABLE IF NOT EXISTS memes (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    img BYTEA NOT NULL,
    contentType TEXT NOT NULL,
    course TEXT NOT NULL,
    authorUserId TEXT,
    addedAt TIMESTAMP,
    lastUpdated TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memes_course_id ON memes(course, id);
