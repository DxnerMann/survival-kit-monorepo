CREATE TABLE IF NOT EXISTS quicklinks (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    url TEXT,
    clickedThisMonth INTEGER,
    clickedOverall INTEGER,
    favouriteCount INTEGER,
    approvedByAdmin BOOLEAN,
    addedAt TIMESTAMP,
    lastUpdated TIMESTAMP,
    lastReset TIMESTAMP
);