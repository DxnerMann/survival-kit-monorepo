ALTER TABLE users ADD COLUMN IF NOT EXISTS calendarAccessCode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_calendar_access_code
    ON users (calendarAccessCode)
    WHERE calendarAccessCode IS NOT NULL;
