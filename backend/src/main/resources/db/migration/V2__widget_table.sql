CREATE TABLE IF NOT EXISTS userWidgets(
    id TEXT PRIMARY KEY,
    userId TEXT references users,
    type TEXT,
    x INTEGER,
    y INTEGER,
    width INTEGER,
    height INTEGER,
    data TEXT
);
