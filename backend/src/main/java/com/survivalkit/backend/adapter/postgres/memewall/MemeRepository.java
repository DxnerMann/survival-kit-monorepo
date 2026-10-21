package com.survivalkit.backend.adapter.postgres.memewall;

import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.core.security.SecurityLog;
import com.survivalkit.backend.shared.Page;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static com.survivalkit.backend.shared.ContinuationTokenHelper.decode;
import static com.survivalkit.backend.shared.ContinuationTokenHelper.encode;
import static com.survivalkit.backend.shared.Utils.toTimestamp;

@Repository
public class MemeRepository implements MemePersistancePort {

    private final JdbcClient jdbcClient;
    private final SecurityLog securityLog;

    public MemeRepository(JdbcClient jdbcClient, SecurityLog securityLog) {
        this.jdbcClient = jdbcClient;
        this.securityLog = securityLog;
    }

    @Override
    public void saveMeme(Meme meme) {
        jdbcClient.sql(Statements.SAVE.sql)
                .paramSource(new MapSqlParameterSource("id", meme.id())
                        .addValue("title", meme.title())
                        .addValue("description", meme.description())
                        .addValue("img", meme.img())
                        .addValue("contentType", meme.contentType())
                        .addValue("course", meme.course())
                        .addValue("authorUserId", meme.authorUserId())
                        .addValue("likes", meme.likes())
                        .addValue("dislikes", meme.dislikes())
                        .addValue("currentTime", toTimestamp(Instant.now())))
                .update();

        securityLog.logInfo(ErrorCode.ErrorCategory.MEME, String.format("New meme saved with id %s", meme.id()));
    }

    @Override
    public Optional<Meme> findDailyMeme(String course, String day) {
        return jdbcClient.sql(Statements.GET_DAILY.sql)
                .paramSource(new MapSqlParameterSource("course", course)
                        .addValue("day", day))
                .query(Meme.class)
                .optional();
    }

    @Override
    public Page<Meme> getMemesByCourse(String course, int pageSize, String continuation) {
        var memes = jdbcClient.sql(Statements.GET_BY_COURSE.sql)
                .paramSource(new MapSqlParameterSource("course", course)
                        .addValue("pageSize", pageSize)
                        .addValue("continuation", decode(continuation)))
                .query(Meme.class)
                .list();

        if (memes.isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }

        return new Page<>(
                memes,
                memes.size() < pageSize ? null : encode(memes.getLast().id())
        );
    }

    @Override
    public Page<Meme> getMemesForAdmin(String course, int pageSize, String continuation) {
        var memes = jdbcClient.sql(Statements.GET_FOR_ADMIN.sql)
                .paramSource(new MapSqlParameterSource("course", course)
                        .addValue("pageSize", pageSize)
                        .addValue("continuation", decode(continuation)))
                .query(Meme.class)
                .list();

        if (memes.isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }

        return new Page<>(
                memes,
                memes.size() < pageSize ? null : encode(memes.getLast().id())
        );
    }

    @Override
    public Optional<Meme> getMemeByIdAndCourse(String id, String course) {
        return jdbcClient.sql(Statements.GET_BY_ID_AND_COURSE.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                        .addValue("course", course))
                .query(Meme.class)
                .optional();
    }

    @Override
    public Optional<MemeOwner> findOwner(String id) {
        return jdbcClient.sql(Statements.FIND_OWNER.sql)
                .param("id", id)
                .query((rs, rowNum) -> new MemeOwner(
                        rs.getString("id"),
                        rs.getString("title"),
                        rs.getString("authorUserId"),
                        rs.getString("course")
                ))
                .optional();
    }

    @Override
    @Transactional
    public void deleteMeme(String id) {
        jdbcClient.sql(Statements.DELETE_VOTES.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .update();
        jdbcClient.sql(Statements.DELETE.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .update();

        securityLog.logInfo(ErrorCode.ErrorCategory.MEME, String.format("Meme with id %s deleted", id));
    }

    @Override
    @Transactional
    public boolean rateMeme(String id, boolean upVote, String userId) {
        var inserted = jdbcClient.sql(Statements.INSERT_VOTE.sql)
                .paramSource(new MapSqlParameterSource("memeId", id)
                        .addValue("userId", userId))
                .update();

        if (inserted == 0) {
            return false;
        }

        jdbcClient.sql(Statements.UPDATE_RATING.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                        .addValue("upVote", upVote)
                        .addValue("currentTime", toTimestamp(Instant.now())))
                .update();
        return true;
    }

    @Override
    public boolean canVote(String memeId, String userId) {
        return jdbcClient.sql(Statements.HAS_VOTE.sql)
                .paramSource(new MapSqlParameterSource("memeId", memeId)
                        .addValue("userId", userId))
                .query(Integer.class)
                .optional()
                .isEmpty();
    }

    enum Statements {
        // language=sql
        SAVE("""
            INSERT INTO memes (id, title, description, img, contentType, course, authorUserId, likes, dislikes, addedAt, lastUpdated)
            VALUES (:id, :title, :description, :img, :contentType, :course, :authorUserId, :likes, :dislikes, :currentTime, :currentTime)
        """),

        // language=sql
        GET_BY_COURSE("""
            SELECT
                m.id,
                m.title,
                m.description,
                m.img,
                m.contentType,
                m.course,
                m.authorUserId,
                m.addedAt,
                m.lastUpdated,
                m.likes,
                m.dislikes,
                u.username AS "authorUsername"
            FROM memes m
            LEFT JOIN users u ON u.id = m.authorUserId
            WHERE m.course = :course
              AND (
                :continuation::TEXT IS NULL
                OR (m.addedAt, m.id) < (
                    SELECT addedAt, id FROM memes WHERE id = :continuation
                )
              )
            ORDER BY m.addedAt DESC, m.id DESC
            LIMIT :pageSize
        """),

        // language=sql
        GET_DAILY("""
            SELECT
                m.id,
                m.title,
                m.description,
                m.img,
                m.contentType,
                m.course,
                m.authorUserId,
                m.addedAt,
                m.lastUpdated,
                m.likes,
                m.dislikes,
                u.username AS "authorUsername"
            FROM memes m
            LEFT JOIN users u ON u.id = m.authorUserId
            WHERE m.course = :course
            ORDER BY md5(m.id || CAST(:day AS text))
            LIMIT 1
        """),

        // language=sql
        GET_FOR_ADMIN("""
            SELECT
                m.id,
                m.title,
                m.description,
                m.img,
                m.contentType,
                m.course,
                m.authorUserId,
                m.addedAt,
                m.lastUpdated,
                m.likes,
                m.dislikes,
                u.username AS "authorUsername"
            FROM memes m
            LEFT JOIN users u ON u.id = m.authorUserId
            WHERE (:course::TEXT IS NULL OR m.course = :course)
              AND (:continuation::TEXT IS NULL OR m.id > :continuation)
            ORDER BY m.id
            LIMIT :pageSize
        """),

        // language=sql
        GET_BY_ID_AND_COURSE("""
            SELECT
                m.id,
                m.title,
                m.description,
                m.img,
                m.contentType,
                m.course,
                m.authorUserId,
                m.addedAt,
                m.lastUpdated,
                m.likes,
                m.dislikes,
                u.username AS "authorUsername"
            FROM memes m
            LEFT JOIN users u ON u.id = m.authorUserId
            WHERE m.id = :id AND m.course = :course
        """),

        // language=sql
        FIND_OWNER("""
            SELECT id, title, authorUserId, course
            FROM memes
            WHERE id = :id
        """),

        DELETE("""
            DELETE FROM memes WHERE id = :id
        """),

        // language=sql
        DELETE_VOTES("""
            DELETE FROM memeVotes WHERE memeId = :id
        """),

        // language=sql
        INSERT_VOTE("""
            INSERT INTO memeVotes (memeId, userId)
            VALUES (:memeId, :userId)
            ON CONFLICT (memeId, userId) DO NOTHING
        """),

        // language=sql
        UPDATE_RATING("""
            UPDATE memes
            SET
                likes = likes + CASE WHEN :upVote THEN 1 ELSE 0 END,
                dislikes = dislikes + CASE WHEN :upVote THEN 0 ELSE 1 END,
                lastUpdated = :currentTime
            WHERE id = :id
        """),

        // language=sql
        HAS_VOTE("""
            SELECT 1 FROM memeVotes WHERE memeId = :memeId AND userId = :userId LIMIT 1
        """);

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
