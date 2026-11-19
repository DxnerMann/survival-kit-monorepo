-- Award the XP already stored activity would have given under the current rules.
-- A later run only fills gaps, so deploying this after it has already been applied changes nothing.
-- Days are Europe/Berlin. Timestamps are stored as UTC.
-- Daily chat older than the XP ledger is gone, so those messages stay at whatever userXpGrants already recorded.
-- Meme and feedback votes have no timestamp. Every saved vote counts. The daily cap did not
-- cut anyone: grouped onto the day the meme or idea was created, no one is over the cap.

WITH amounts(action, xp, cap) AS (
    VALUES
        ('LOGGED_IN', 15, 1),
        ('MEME_UPLOADED', 60, 6),
        ('MEME_VOTE', 5, 25),
        ('CHAT_MESSAGE', 5, 25),
        ('CHAT_REACTION', 1, 20),
        ('CAFFEINE_LOGGED', 15, 8),
        ('IDEA_SUBMITTED', 40, 3),
        ('FEEDBACK_VOTE', 5, 20),
        ('GAME_SUGGESTED', 30, 2),
        ('PRESENTATION_GAME', 15, 4)
),
raw AS (
    SELECT useridifuser AS userid,
           'LOGGED_IN' AS action,
           ((timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text AS day,
           count(*)::int AS n
    FROM trackactions
    WHERE type = 'LOGGED_IN' AND useridifuser IS NOT NULL
    GROUP BY 1, 3

    UNION ALL
    SELECT authoruserid,
           'MEME_UPLOADED',
           ((addedat AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
           count(*)::int
    FROM memes
    WHERE authoruserid IS NOT NULL AND addedat IS NOT NULL
    GROUP BY 1, 3

    UNION ALL
    SELECT useridifuser,
           'PRESENTATION_GAME',
           ((timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
           count(*)::int
    FROM trackactions
    WHERE type = 'PRESENTATION_GAME_PLAYED' AND useridifuser IS NOT NULL
    GROUP BY 1, 3

    UNION ALL
    SELECT useridifuser,
           'IDEA_SUBMITTED',
           ((timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
           count(*)::int
    FROM trackactions
    WHERE type = 'IDEA_SUBMITTED' AND useridifuser IS NOT NULL
    GROUP BY 1, 3

    UNION ALL
    SELECT useridifuser,
           'GAME_SUGGESTED',
           ((timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
           count(*)::int
    FROM trackactions
    WHERE type = 'GAME_SUGGESTED' AND useridifuser IS NOT NULL
    GROUP BY 1, 3

    UNION ALL
    SELECT userid,
           'CAFFEINE_LOGGED',
           ((consumedat AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
           count(*)::int
    FROM caffeineentries
    WHERE userid IS NOT NULL
    GROUP BY 1, 3

    UNION ALL
    SELECT authoruserid,
           'CHAT_MESSAGE',
           ((createdat AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
           count(*)::int
    FROM chatmessages
    WHERE authoruserid IS NOT NULL
      AND char_length(regexp_replace(coalesce(body, ''), '[^[:alpha:]]', '', 'g')) > 3
    GROUP BY 1, 3

    UNION ALL
    SELECT userid,
           'CHAT_REACTION',
           ((createdat AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
           count(*)::int
    FROM chatreactions
    WHERE userid IS NOT NULL
    GROUP BY 1, 3
),
hist AS (
    SELECT r.userid, r.action, r.day, LEAST(r.n, a.cap) AS n
    FROM raw r
    JOIN amounts a ON a.action = r.action
    JOIN users u ON u.id = r.userid
),
vote_counts AS (
    SELECT v.userid, 'MEME_VOTE' AS action, count(*)::int AS n
    FROM memevotes v
    JOIN users u ON u.id = v.userid
    GROUP BY v.userid

    UNION ALL
    SELECT v.userid, 'FEEDBACK_VOTE', count(*)::int
    FROM feedbackvotes v
    JOIN users u ON u.id = v.userid
    GROUP BY v.userid
),
grant_totals AS (
    SELECT userid, action, COALESCE(SUM(count), 0)::int AS n
    FROM userxpgrants
    WHERE action IN ('MEME_VOTE', 'FEEDBACK_VOTE')
    GROUP BY userid, action
),
dated AS (
    SELECT COALESCE(h.userid, g.userid) AS userid,
           COALESCE(h.action, g.action) AS action,
           SUM(GREATEST(COALESCE(h.n, 0), COALESCE(g.count, 0)))::int AS n
    FROM hist h
    FULL JOIN userxpgrants g
        ON g.userid = h.userid
       AND g.action = h.action
       AND g.day = h.day
    WHERE COALESCE(h.action, g.action) NOT IN ('MEME_VOTE', 'FEEDBACK_VOTE')
    GROUP BY 1, 2
),
earned AS (
    SELECT d.userid, d.action, d.n
    FROM dated d

    UNION ALL
    SELECT COALESCE(v.userid, g.userid),
           COALESCE(v.action, g.action),
           GREATEST(COALESCE(v.n, 0), COALESCE(g.n, 0))
    FROM vote_counts v
    FULL JOIN grant_totals g
        ON g.userid = v.userid AND g.action = v.action
),
totals AS (
    SELECT e.userid, COALESCE(SUM(e.n * a.xp), 0)::int AS xp
    FROM earned e
    JOIN amounts a ON a.action = e.action
    GROUP BY e.userid
)
UPDATE users u
SET xp = t.xp
FROM totals t
WHERE u.id = t.userid
  AND u.xp IS DISTINCT FROM t.xp;

INSERT INTO userxpgrants (userid, action, day, count)
SELECT userid, action, day, n
FROM (
    SELECT r.userid, r.action, r.day, LEAST(r.n, a.cap) AS n
    FROM (
        SELECT useridifuser AS userid,
               'LOGGED_IN' AS action,
               ((timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text AS day,
               count(*)::int AS n
        FROM trackactions
        WHERE type = 'LOGGED_IN' AND useridifuser IS NOT NULL
        GROUP BY 1, 3
        UNION ALL
        SELECT authoruserid, 'MEME_UPLOADED',
               ((addedat AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
               count(*)::int
        FROM memes
        WHERE authoruserid IS NOT NULL AND addedat IS NOT NULL
        GROUP BY 1, 3
        UNION ALL
        SELECT useridifuser, 'PRESENTATION_GAME',
               ((timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
               count(*)::int
        FROM trackactions
        WHERE type = 'PRESENTATION_GAME_PLAYED' AND useridifuser IS NOT NULL
        GROUP BY 1, 3
        UNION ALL
        SELECT useridifuser, 'IDEA_SUBMITTED',
               ((timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
               count(*)::int
        FROM trackactions
        WHERE type = 'IDEA_SUBMITTED' AND useridifuser IS NOT NULL
        GROUP BY 1, 3
        UNION ALL
        SELECT useridifuser, 'GAME_SUGGESTED',
               ((timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
               count(*)::int
        FROM trackactions
        WHERE type = 'GAME_SUGGESTED' AND useridifuser IS NOT NULL
        GROUP BY 1, 3
        UNION ALL
        SELECT userid, 'CAFFEINE_LOGGED',
               ((consumedat AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
               count(*)::int
        FROM caffeineentries
        WHERE userid IS NOT NULL
        GROUP BY 1, 3
        UNION ALL
        SELECT authoruserid, 'CHAT_MESSAGE',
               ((createdat AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
               count(*)::int
        FROM chatmessages
        WHERE authoruserid IS NOT NULL
          AND char_length(regexp_replace(coalesce(body, ''), '[^[:alpha:]]', '', 'g')) > 3
        GROUP BY 1, 3
        UNION ALL
        SELECT userid, 'CHAT_REACTION',
               ((createdat AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')::date::text,
               count(*)::int
        FROM chatreactions
        WHERE userid IS NOT NULL
        GROUP BY 1, 3
    ) r
    JOIN (
        VALUES
            ('LOGGED_IN', 1),
            ('MEME_UPLOADED', 6),
            ('CHAT_MESSAGE', 25),
            ('CHAT_REACTION', 20),
            ('CAFFEINE_LOGGED', 8),
            ('IDEA_SUBMITTED', 3),
            ('GAME_SUGGESTED', 2),
            ('PRESENTATION_GAME', 4)
    ) AS a(action, cap) ON a.action = r.action
    JOIN users u ON u.id = r.userid
) capped
ON CONFLICT (userid, action, day)
DO UPDATE SET count = GREATEST(userxpgrants.count, EXCLUDED.count);

INSERT INTO userxpgrants (userid, action, day, count)
SELECT v.userid, v.action, '1970-01-01', v.n - COALESCE(g.n, 0)
FROM (
    SELECT v.userid, 'MEME_VOTE' AS action, count(*)::int AS n
    FROM memevotes v
    JOIN users u ON u.id = v.userid
    GROUP BY v.userid
    UNION ALL
    SELECT v.userid, 'FEEDBACK_VOTE', count(*)::int
    FROM feedbackvotes v
    JOIN users u ON u.id = v.userid
    GROUP BY v.userid
) v
LEFT JOIN (
    SELECT userid, action, COALESCE(SUM(count), 0)::int AS n
    FROM userxpgrants
    WHERE action IN ('MEME_VOTE', 'FEEDBACK_VOTE')
    GROUP BY userid, action
) g ON g.userid = v.userid AND g.action = v.action
WHERE v.n > COALESCE(g.n, 0)
ON CONFLICT (userid, action, day)
DO UPDATE SET count = userxpgrants.count + EXCLUDED.count;
