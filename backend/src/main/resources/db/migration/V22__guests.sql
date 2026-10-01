CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    firstSeen TIMESTAMP NOT NULL,
    lastSeen TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guests_last_seen ON guests (lastSeen);
