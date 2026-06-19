package com.survivalkit.backend.adapter.postgres.feedback;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.core.security.SecurityLog;
import com.survivalkit.backend.shared.Page;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

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
                            .addValue("authorUserId", feedback.authorUserId())
                            .addValue("type", feedback.type().toString())
                            .addValue("likes", feedback.likes())
                            .addValue("dislikes", feedback.dislikes())
                            .addValue("answer", feedback.answer())
                            .addValue("currentTime", toTimestamp(Instant.now())))
                .update();
        securityLog.logInfo(Log.SecurityLogSubType.DATABASE, String.format("New Feedback saved for user %s with ID %s", feedback.authorUserId(), feedback.id()));

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
    public void rateFeedback(String id, Boolean upVote, String userId) {
        jdbcClient.sql(Statements.UPDATE_RATING.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                    .addValue("upVote", upVote)
                    .addValue("currentTime", toTimestamp(Instant.now())))
                .update();

        jdbcClient.sql(Statements.INSERT_RATING.sql)
                .paramSource(new MapSqlParameterSource("feedbackId", id)
                    .addValue("userId", userId))
                .update();
    }

    @Override
    @Transactional
    public void deleteFeedback(String id) {
        jdbcClient.sql(Statements.DELETE_VOTES.sql).paramSource(new MapSqlParameterSource("id", id))
                .update();
        jdbcClient.sql(Statements.DELETE.sql).paramSource(new MapSqlParameterSource("id", id))
                .update();
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
    public boolean canVote(String feedbackId, String userId) {
        var userVotes = jdbcClient.sql(Statements.GET_USER_VOTES.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .query(String.class)
                .list();

        return !userVotes.contains(feedbackId);
    }

    enum Statements {
        // language=sql
        SAVE("""
            INSERT INTO feedback (id, title, description, authorUsername, authorUserId, type, likes, dislikes, answer, addedAt, lastUpdated)
            VALUES (:id, :title, :description, :authorUsername, :authorUserId, :type, :likes, :dislikes, :answer, :currentTime, :currentTime)
        """),

        // language=sql
        GET("""
            SELECT * FROM feedback WHERE (:continuation::TEXT IS NULL OR id > :continuation) ORDER BY id LIMIT :pageSize
        """),

        // language=sql
        UPDATE_RATING("""
            UPDATE feedback
            SET
                likes    = likes    + CASE WHEN :upVote THEN 1 ELSE 0 END,
                dislikes = dislikes + CASE WHEN :upVote THEN 0 ELSE 1 END,
                lastUpdated = :currentTime
            WHERE id = :id;
        """),
        // language=sql
        INSERT_RATING("""
            INSERT INTO feedbackVotes (feedbackId, userId)
            VALUES (:feedbackId, :userId)
            ON CONFLICT (feedbackid, userId) DO NOTHING
        """),

        // language=sql
        DELETE("""
            DELETE FROM feedback WHERE id = :id
        """),

        // language=sql
        DELETE_VOTES("""
            DELETE FROM feedbackVotes WHERE feedbackId = :id
        """),

        // language=sql
        ANSWER("""
            UPDATE feedback SET answer = :answer, lastUpdated = :currentTime WHERE id = :id
        """),

        // language=sql
        GET_USER_VOTES("""
            SELECT feedbackId FROM feedbackVotes WHERE userId = :userId
        """);

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
