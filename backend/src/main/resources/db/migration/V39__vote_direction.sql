ALTER TABLE memeVotes ADD COLUMN IF NOT EXISTS upVote BOOLEAN;
ALTER TABLE feedbackVotes ADD COLUMN IF NOT EXISTS upVote BOOLEAN;

CREATE TABLE IF NOT EXISTS memeVoteAwards (
    memeId TEXT NOT NULL,
    userId TEXT NOT NULL,
    PRIMARY KEY (memeId, userId)
);

CREATE TABLE IF NOT EXISTS feedbackVoteAwards (
    feedbackId TEXT NOT NULL,
    userId TEXT NOT NULL,
    PRIMARY KEY (feedbackId, userId)
);

INSERT INTO memeVoteAwards (memeId, userId)
SELECT memeId, userId FROM memeVotes
ON CONFLICT DO NOTHING;

INSERT INTO feedbackVoteAwards (feedbackId, userId)
SELECT feedbackId, userId FROM feedbackVotes
ON CONFLICT DO NOTHING;
