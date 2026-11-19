package com.survivalkit.backend.adapter.postgres.feedback;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.core.security.SecurityLog;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.UserVote;
import com.survivalkit.backend.shared.VoteUpdate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static com.survivalkit.backend.shared.ContinuationTokenHelper.decode;
import static com.survivalkit.backend.shared.ContinuationTokenHelper.encode;
import static com.survivalkit.backend.shared.Utils.toTimestamp;

@Repository
public class FeedbackRepository implements FeedbackPersistancePort {

    private final JdbcClient jdbcClient;
    private final SecurityLog securityLog;

    public FeedbackRepository(JdbcClient jdbcClient, SecurityLog securityLog) {
        this.jdbcClient = jdbcClient;
        this.securityLog = securityLog;
    }

    @Override
    public void saveFeedback(Feedback feedback) {
        jdbcClient.sql(Statements.SAVE.sql).paramSource(
                    new MapSqlParameterSource("id", feedback.id())
                            .addValue("title", feedback.title())
                            .addValue("description", feedback.description())
                            .addValue("authorUsername", feedback.authorUsername())
                            .addValue("authorUserId", feedback.authorUserId(), Types.VARCHAR)
                            .addValue("type", feedback.type().toString())
                            .addValue("likes", feedback.likes())
                            .addValue("dislikes", feedback.dislikes())
                            .addValue("answer", feedback.answer())
                            .addValue("currentTime", toTimestamp(Instant.now())))
                .update();
        securityLog.logInfo(ErrorCode.ErrorCategory.FEEDBACK, String.format("New Feedback saved for user %s with ID %s", feedback.authorUserId(), feedback.id()));

    }

    @Override
    public Page<Feedback> getFeedbackPaged(int pageSize, String continuation) {
        var feedbacks = jdbcClient.sql(Statements.GET.sql).paramSource(
                        new MapSqlParameterSource("pageSize", pageSize)
                                .addValue("continuation", decode(continuation)))
                .query(Feedback.class)
                .list();

        if (feedbacks.isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }

        return new Page<>(
                feedbacks,
                encode(feedbacks.getLast().id())
        );
    }

    @Override
    @Transactional
    public VoteUpdate castFeedbackVote(String id, boolean upVote, String userId) {
        var existing = findVote(id, userId);
        if (existing.isEmpty()) {
            jdbcClient.sql(Statements.INSERT_RATING.sql)
                    .paramSource(new MapSqlParameterSource("feedbackId", id)
                            .addValue("userId", userId)
                            .addValue("upVote", upVote))
                    .update();
            shiftCounts(id, upVote ? 1 : 0, upVote ? 0 : 1);
            var awarded = jdbcClient.sql(Statements.INSERT_AWARD.sql)
                    .paramSource(new MapSqlParameterSource("feedbackId", id).addValue("userId", userId))
                    .update() > 0;
            var counts = readCounts(id);
            return new VoteUpdate(upVote, counts.likes(), counts.dislikes(), awarded, upVote);
        }

        var previous = existing.get().upVote();
        if (previous == null) {
            jdbcClient.sql(Statements.SET_VOTE.sql)
                    .paramSource(new MapSqlParameterSource("feedbackId", id)
                            .addValue("userId", userId)
                            .addValue("upVote", upVote))
                    .update();
            var counts = readCounts(id);
            return new VoteUpdate(upVote, counts.likes(), counts.dislikes(), false, false);
        }
        if (previous == upVote) {
            jdbcClient.sql(Statements.DELETE_USER_VOTE.sql)
                    .paramSource(new MapSqlParameterSource("feedbackId", id).addValue("userId", userId))
                    .update();
            shiftCounts(id, upVote ? -1 : 0, upVote ? 0 : -1);
            var counts = readCounts(id);
            return new VoteUpdate(null, counts.likes(), counts.dislikes(), false, false);
        }

        jdbcClient.sql(Statements.SET_VOTE.sql)
                .paramSource(new MapSqlParameterSource("feedbackId", id)
                        .addValue("userId", userId)
                        .addValue("upVote", upVote))
                .update();
        shiftCounts(id, upVote ? 1 : -1, upVote ? -1 : 1);
        var counts = readCounts(id);
        return new VoteUpdate(upVote, counts.likes(), counts.dislikes(), false, upVote);
    }

    @Override
    public List<UserVote> findVotesByUser(String userId) {
        return jdbcClient.sql(Statements.FIND_VOTES_BY_USER.sql)
                .param("userId", userId)
                .query((rs, rowNum) -> new UserVote(rs.getString("id"), readNullableBoolean(rs, "upVote")))
                .list();
    }

    private Optional<StoredVote> findVote(String feedbackId, String userId) {
        return jdbcClient.sql(Statements.FIND_VOTE.sql)
                .paramSource(new MapSqlParameterSource("feedbackId", feedbackId).addValue("userId", userId))
                .query((rs, rowNum) -> new StoredVote(readNullableBoolean(rs, "upVote")))
                .optional();
    }

    private void shiftCounts(String id, int likeDelta, int dislikeDelta) {
        jdbcClient.sql(Statements.SHIFT_RATING.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                        .addValue("likeDelta", likeDelta)
                        .addValue("dislikeDelta", dislikeDelta)
                        .addValue("currentTime", toTimestamp(Instant.now())))
                .update();
    }

    private Counts readCounts(String id) {
        return jdbcClient.sql(Statements.READ_COUNTS.sql)
                .param("id", id)
                .query((rs, rowNum) -> new Counts(rs.getInt("likes"), rs.getInt("dislikes")))
                .optional()
                .orElse(new Counts(0, 0));
    }

    private static Boolean readNullableBoolean(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getObject(column);
        return value == null ? null : rs.getBoolean(column);
    }

    private record Counts(int likes, int dislikes) {
    }

    private record StoredVote(Boolean upVote) {
    }

    @Override
    @Transactional
    public void deleteFeedback(String id) {
        jdbcClient.sql(Statements.DELETE_VOTES.sql).paramSource(new MapSqlParameterSource("id", id))
                .update();
        jdbcClient.sql(Statements.DELETE_AWARDS.sql).paramSource(new MapSqlParameterSource("id", id))
                .update();
        jdbcClient.sql(Statements.DELETE.sql).paramSource(new MapSqlParameterSource("id", id))
                .update();
    }

    @Override
    public boolean resolveFeedback(String id) {
        return jdbcClient.sql(Statements.RESOLVE.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                        .addValue("currentTime", toTimestamp(Instant.now())))
                .update() > 0;
    }

    @Override
    public List<Feedback> findArchived() {
        return jdbcClient.sql(Statements.FIND_ARCHIVED.sql)
                .query(Feedback.class)
                .list();
    }

    @Override
    public void deleteAllVotes(String userId) {
        jdbcClient.sql(Statements.DELETE_ALL_VOTES.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .update();
        jdbcClient.sql(Statements.DELETE_ALL_AWARDS.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .update();
    }

    @Override
    public Optional<String> findAuthorUserId(String id) {
        return jdbcClient.sql(Statements.FIND_AUTHOR.sql)
                .param("id", id)
                .query(String.class)
                .optional();
    }

    @Override
    public Optional<FeedbackSubject> findSubject(String id) {
        return jdbcClient.sql(Statements.FIND_SUBJECT.sql)
                .param("id", id)
                .query((rs, rowNum) -> new FeedbackSubject(
                        rs.getString("authorUserId"),
                        rs.getString("title")
                ))
                .optional();
    }

    @Override
    public void answerFeedback(String id, String answer) {
        jdbcClient.sql(Statements.ANSWER.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                .addValue("answer", answer)
                .addValue("currentTime", toTimestamp(Instant.now())))
                .update();
    }

    @Override
    public List<AnsweredFeedbackNotice> findAnsweredByUser(String userId) {
        return jdbcClient.sql(Statements.FIND_ANSWERED_BY_USER.sql)
                .param("userId", userId)
                .query((rs, rowNum) -> new AnsweredFeedbackNotice(
                        rs.getString("id"),
                        rs.getString("title")
                ))
                .list();
    }

    @Override
    public boolean canVote(String feedbackId, String userId) {
        var userVotes = jdbcClient.sql(Statements.GET_USER_VOTES.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .query(String.class)
                .list();

        return !userVotes.contains(feedbackId);
    }

    @Override
    public void deleteUser(String userId) {
        jdbcClient.sql(Statements.USER_DELETE.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .update();
    }

    enum Statements {
        // language=sql
        SAVE("""
            INSERT INTO feedback (id, title, description, authorUsername, authorUserId, type, likes, dislikes, answer, addedAt, lastUpdated)
            VALUES (:id, :title, :description, :authorUsername, :authorUserId, :type, :likes, :dislikes, :answer, :currentTime, :currentTime)
        """),

        // language=sql
        GET("""
            SELECT * FROM feedback
            WHERE resolvedAt IS NULL
              AND (:continuation::TEXT IS NULL OR id > :continuation)
            ORDER BY id
            LIMIT :pageSize
        """),

        // language=sql
        INSERT_RATING("""
            INSERT INTO feedbackVotes (feedbackId, userId, upVote)
            VALUES (:feedbackId, :userId, :upVote)
        """),

        SET_VOTE("""
            UPDATE feedbackVotes SET upVote = :upVote WHERE feedbackId = :feedbackId AND userId = :userId
        """),

        DELETE_USER_VOTE("""
            DELETE FROM feedbackVotes WHERE feedbackId = :feedbackId AND userId = :userId
        """),

        INSERT_AWARD("""
            INSERT INTO feedbackVoteAwards (feedbackId, userId)
            VALUES (:feedbackId, :userId)
            ON CONFLICT (feedbackId, userId) DO NOTHING
        """),

        SHIFT_RATING("""
            UPDATE feedback
            SET
                likes = GREATEST(0, COALESCE(likes, 0) + :likeDelta),
                dislikes = GREATEST(0, COALESCE(dislikes, 0) + :dislikeDelta),
                lastUpdated = :currentTime
            WHERE id = :id
        """),

        READ_COUNTS("""
            SELECT likes, dislikes FROM feedback WHERE id = :id
        """),

        FIND_VOTE("""
            SELECT upVote FROM feedbackVotes WHERE feedbackId = :feedbackId AND userId = :userId
        """),

        FIND_VOTES_BY_USER("""
            SELECT feedbackId AS id, upVote FROM feedbackVotes WHERE userId = :userId
        """),

        // language=sql
        DELETE("""
            DELETE FROM feedback WHERE id = :id
        """),

        RESOLVE("""
            UPDATE feedback
            SET resolvedAt = :currentTime, lastUpdated = :currentTime
            WHERE id = :id AND resolvedAt IS NULL
        """),

        FIND_ARCHIVED("""
            SELECT * FROM feedback
            WHERE resolvedAt IS NOT NULL
            ORDER BY resolvedAt DESC, id DESC
        """),

        // language=sql
        USER_DELETE("""
            UPDATE feedback SET authorusername = 'Unbekannter Benutzer', authoruserid = CONCAT('deleted_', authoruserid)  WHERE authoruserid = :userId
        """
        ),

        // language=sql
        DELETE_VOTES("""
            DELETE FROM feedbackVotes WHERE feedbackId = :id
        """),

        // language=sql
        DELETE_ALL_VOTES("""
            DELETE FROM feedbackVotes WHERE userId = :userId
        """),

        DELETE_AWARDS("""
            DELETE FROM feedbackVoteAwards WHERE feedbackId = :id
        """),

        DELETE_ALL_AWARDS("""
            DELETE FROM feedbackVoteAwards WHERE userId = :userId
        """),
        // language=sql
        ANSWER("""
            UPDATE feedback SET answer = :answer, lastUpdated = :currentTime WHERE id = :id
        """),

        // language=sql
        GET_USER_VOTES("""
            SELECT feedbackId FROM feedbackVotes WHERE userId = :userId
        """),

        // language=sql
        FIND_ANSWERED_BY_USER("""
            SELECT id, title FROM feedback
            WHERE authoruserid = :userId
              AND answer IS NOT NULL
              AND BTRIM(answer) <> ''
            ORDER BY lastUpdated DESC
        """),
        FIND_AUTHOR("""
            SELECT authorUserId FROM feedback WHERE id = :id
        """),
        FIND_SUBJECT("""
            SELECT authorUserId, title FROM feedback WHERE id = :id
        """);

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
