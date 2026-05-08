CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    firstname TEXT,
    lastname TEXT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    verificationToken TEXT,
    isVerified BOOLEAN,
    createdAt TIMESTAMP,
    lastUpdated TIMESTAMP
);