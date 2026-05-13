CREATE TABLE IF NOT EXISTS courses(
    course TEXT PRIMARY KEY,
    raplaBaseUrl TEXT
);

ALTER TABLE users ADD COLUMN course TEXT DEFAULT null;