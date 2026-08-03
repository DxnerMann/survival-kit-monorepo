ALTER TABLE presentation_game_rooms
    ADD COLUMN current_word_index INT NOT NULL DEFAULT 0;

CREATE TABLE presentation_game_room_words (
    room_id TEXT NOT NULL REFERENCES presentation_game_rooms(id) ON DELETE CASCADE,
    word_index INT NOT NULL,
    word TEXT NOT NULL,
    PRIMARY KEY (room_id, word_index)
);

CREATE TABLE presentation_game_word_votes (
    room_id TEXT NOT NULL REFERENCES presentation_game_rooms(id) ON DELETE CASCADE,
    word_index INT NOT NULL,
    user_id TEXT NOT NULL,
    vote_type TEXT NOT NULL,
    voted_at TIMESTAMP NOT NULL,
    PRIMARY KEY (room_id, word_index, user_id)
);

CREATE INDEX idx_presentation_game_word_votes_room_word
    ON presentation_game_word_votes (room_id, word_index);
