CREATE TABLE IF NOT EXISTS trackActions (
    id TEXT PRIMARY KEY,
    type TEXT,
    userIdIfUser TEXT,
    courseIfUser TEXT,
    timestamp TIMESTAMP
);