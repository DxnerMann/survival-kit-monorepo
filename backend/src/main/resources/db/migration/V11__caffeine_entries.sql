CREATE TABLE IF NOT EXISTS caffeineEntries (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    source TEXT NOT NULL,
    amountMg INT NOT NULL,
    consumedAt TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_caffeine_userid_consumedat ON caffeineEntries (userId, consumedAt);
CREATE INDEX IF NOT EXISTS idx_caffeine_consumedat ON caffeineEntries (consumedAt);
