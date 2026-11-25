CREATE TABLE IF NOT EXISTS draw_boards (
    id TEXT PRIMARY KEY,
    user_low TEXT NOT NULL,
    user_high TEXT NOT NULL,
    day TEXT NOT NULL,
    strokes TEXT NOT NULL,
    reset_low BOOLEAN NOT NULL DEFAULT FALSE,
    reset_high BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL,
    UNIQUE (user_low, user_high)
);
