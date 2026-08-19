CREATE TABLE IF NOT EXISTS chatMessages (
    id TEXT PRIMARY KEY,
    course TEXT NOT NULL,
    authorUserId TEXT NOT NULL,
    authorUsername TEXT NOT NULL,
    body TEXT,
    createdAt TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_course_created
    ON chatMessages (course, createdAt);

CREATE TABLE IF NOT EXISTS chatAttachments (
    id TEXT PRIMARY KEY,
    messageId TEXT REFERENCES chatMessages(id) ON DELETE CASCADE,
    course TEXT NOT NULL,
    authorUserId TEXT NOT NULL,
    filename TEXT NOT NULL,
    contentType TEXT NOT NULL,
    byteSize INTEGER NOT NULL,
    durationMs INTEGER,
    kind TEXT NOT NULL,
    data BYTEA NOT NULL,
    createdAt TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message
    ON chatAttachments (messageId);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_course
    ON chatAttachments (course, createdAt);
