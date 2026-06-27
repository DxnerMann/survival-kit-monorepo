ALTER TABLE trackActions
    DROP COLUMN courseIfUser;

ALTER TABLE trackActions
    ADD CONSTRAINT trackactions_timestamp_key
        UNIQUE (timestamp);
