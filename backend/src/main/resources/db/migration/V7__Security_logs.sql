CREATE TABLE IF NOT EXISTS securityLogs(
    type TEXT,
    subType TEXT,
    timestamp TIMESTAMPTZ PRIMARY KEY,
    message TEXT
);

