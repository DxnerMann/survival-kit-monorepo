CREATE TABLE IF NOT EXISTS favourites (
    userId TEXT,
    quickLinkId TEXT,
    UNIQUE (userId, quickLinkId)
);