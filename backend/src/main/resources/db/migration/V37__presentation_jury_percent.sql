ALTER TABLE presentation_game_rooms
    ADD COLUMN IF NOT EXISTS approval_percent INTEGER NOT NULL DEFAULT 50;

ALTER TABLE presentation_game_rooms
    ADD COLUMN IF NOT EXISTS word_advanced_at TIMESTAMP;
