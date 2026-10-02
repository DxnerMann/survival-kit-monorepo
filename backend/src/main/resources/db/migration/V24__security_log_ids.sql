ALTER TABLE securityLogs ADD COLUMN IF NOT EXISTS id TEXT;

UPDATE securityLogs
SET id = md5(timestamp::text || coalesce(message, ''))
WHERE id IS NULL;

ALTER TABLE securityLogs ALTER COLUMN id SET NOT NULL;

ALTER TABLE securityLogs DROP CONSTRAINT IF EXISTS securitylogs_pkey;
ALTER TABLE securityLogs DROP CONSTRAINT IF EXISTS "securityLogs_pkey";

ALTER TABLE securityLogs ADD PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON securityLogs (timestamp DESC);
