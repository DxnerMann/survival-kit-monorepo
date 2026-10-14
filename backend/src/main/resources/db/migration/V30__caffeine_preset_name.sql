ALTER TABLE caffeinePresets
    ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE caffeinePresets
SET name = 'Andere'
WHERE name IS NULL OR btrim(name) = '';

ALTER TABLE caffeinePresets
    ALTER COLUMN name SET NOT NULL;

ALTER TABLE caffeinePresets
    DROP CONSTRAINT IF EXISTS caffeinepresets_userid_amountmg_key;
