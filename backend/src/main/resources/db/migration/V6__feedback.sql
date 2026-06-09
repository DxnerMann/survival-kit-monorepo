CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    authorUsername TEXT,
    authorUserId TEXT,
    type TEXT,
    likes INTEGER,
    dislikes INTEGER,
    answer TEXT,
    addedAt TIMESTAMP,
    lastUpdated TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedbackVotes (
    feedbackId TEXT REFERENCES feedback(id),
    userId     TEXT,
    PRIMARY KEY (feedbackId, userId)
);