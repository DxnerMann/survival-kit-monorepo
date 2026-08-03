CREATE TABLE IF NOT EXISTS presentation_game_rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host_user_id TEXT NOT NULL,
    host_username TEXT NOT NULL,
    course TEXT,
    is_public BOOLEAN NOT NULL,
    join_code TEXT NOT NULL UNIQUE,
    difficulty TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS presentation_game_room_members (
    room_id TEXT NOT NULL REFERENCES presentation_game_rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_presentation_game_rooms_public_course
    ON presentation_game_rooms (course)
    WHERE is_public = true;
