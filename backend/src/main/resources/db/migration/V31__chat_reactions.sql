CREATE TABLE IF NOT EXISTS chatReactions (
    id TEXT PRIMARY KEY,
    messageId TEXT NOT NULL REFERENCES chatMessages(id) ON DELETE CASCADE,
    userId TEXT NOT NULL,
    username TEXT NOT NULL,
    emoji TEXT NOT NULL,
    createdAt TIMESTAMP NOT NULL,
    UNIQUE (messageId, userId, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message
    ON chatReactions (messageId, createdAt);
