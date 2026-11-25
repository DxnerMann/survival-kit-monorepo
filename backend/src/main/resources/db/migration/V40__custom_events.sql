CREATE TABLE IF NOT EXISTS customEvents (
    id TEXT PRIMARY KEY,
    ownerUserId TEXT NOT NULL,
    title TEXT NOT NULL,
    eventDate TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    room TEXT,
    description TEXT,
    createdAt TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_events_owner
    ON customEvents (ownerUserId, eventDate);

CREATE TABLE IF NOT EXISTS customEventInvites (
    id TEXT PRIMARY KEY,
    eventId TEXT NOT NULL,
    inviteeUserId TEXT NOT NULL,
    status TEXT NOT NULL,
    activityId TEXT,
    createdAt TIMESTAMP NOT NULL,
    UNIQUE (eventId, inviteeUserId)
);

CREATE INDEX IF NOT EXISTS idx_custom_event_invites_user
    ON customEventInvites (inviteeUserId, status);
