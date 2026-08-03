ALTER TABLE presentation_game_rooms
    ADD COLUMN status TEXT NOT NULL DEFAULT 'LOBBY',
    ADD COLUMN started_at TIMESTAMP,
    ADD COLUMN finished_at TIMESTAMP,
    ADD COLUMN presenter_points INT NOT NULL DEFAULT 0;

ALTER TABLE presentation_game_room_members
    ADD COLUMN username TEXT;

UPDATE presentation_game_room_members m
SET username = r.host_username
FROM presentation_game_rooms r
WHERE m.room_id = r.id AND m.user_id = r.host_user_id AND m.username IS NULL;
