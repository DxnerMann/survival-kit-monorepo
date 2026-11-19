package com.survivalkit.backend.adapter.postgres.memewall;

import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.core.security.SecurityLog;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.UserVote;
import com.survivalkit.backend.shared.VoteUpdate;
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
        jdbcClient.sql(Statements.DELETE_AWARDS.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .update();
        jdbcClient.sql(Statements.DELETE.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .update();

        securityLog.logInfo(ErrorCode.ErrorCategory.MEME, String.format("Meme with id %s deleted", id));
    }

    @Override
    @Transactional
    public VoteUpdate castMemeVote(String id, boolean upVote, String userId) {
        var existing = findVote(id, userId);
        if (existing.isEmpty()) {
            jdbcClient.sql(Statements.INSERT_VOTE.sql)
                    .paramSource(new MapSqlParameterSource("memeId", id)
                            .addValue("userId", userId)
                            .addValue("upVote", upVote))
                    .update();
            shiftCounts(id, upVote ? 1 : 0, upVote ? 0 : 1);
            var awarded = jdbcClient.sql(Statements.INSERT_AWARD.sql)
                    .paramSource(new MapSqlParameterSource("memeId", id).addValue("userId", userId))
                    .update() > 0;
            var counts = readCounts(id);
            return new VoteUpdate(upVote, counts.likes(), counts.dislikes(), awarded, upVote);
        }

        var previous = existing.get().upVote();
        if (previous == null) {
            jdbcClient.sql(Statements.SET_VOTE.sql)
                    .paramSource(new MapSqlParameterSource("memeId", id)
                            .addValue("userId", userId)
                            .addValue("upVote", upVote))
                    .update();
            var counts = readCounts(id);
            return new VoteUpdate(upVote, counts.likes(), counts.dislikes(), false, false);
        }
        if (previous == upVote) {
            jdbcClient.sql(Statements.DELETE_USER_VOTE.sql)
                    .paramSource(new MapSqlParameterSource("memeId", id).addValue("userId", userId))
                    .update();
            shiftCounts(id, upVote ? -1 : 0, upVote ? 0 : -1);
            var counts = readCounts(id);
            return new VoteUpdate(null, counts.likes(), counts.dislikes(), false, false);
        }

        jdbcClient.sql(Statements.SET_VOTE.sql)
                .paramSource(new MapSqlParameterSource("memeId", id)
                        .addValue("userId", userId)
                        .addValue("upVote", upVote))
                .update();
        shiftCounts(id, upVote ? 1 : -1, upVote ? -1 : 1);
        var counts = readCounts(id);
        return new VoteUpdate(upVote, counts.likes(), counts.dislikes(), false, upVote);
    }

    @Override
    public List<UserVote> findVotesByUser(String userId, String course) {
        return jdbcClient.sql(Statements.FIND_VOTES_BY_USER.sql)
                .paramSource(new MapSqlParameterSource("userId", userId).addValue("course", course))
                .query((rs, rowNum) -> new UserVote(rs.getString("id"), readNullableBoolean(rs, "upVote")))
                .list();
    }

    private Optional<StoredVote> findVote(String memeId, String userId) {
        return jdbcClient.sql(Statements.FIND_VOTE.sql)
                .paramSource(new MapSqlParameterSource("memeId", memeId).addValue("userId", userId))
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

        DELETE_AWARDS("""
            DELETE FROM memeVoteAwards WHERE memeId = :id
        """),

        // language=sql
        INSERT_VOTE("""
            INSERT INTO memeVotes (memeId, userId, upVote)
            VALUES (:memeId, :userId, :upVote)
        """),

        SET_VOTE("""
            UPDATE memeVotes SET upVote = :upVote WHERE memeId = :memeId AND userId = :userId
        """),

        DELETE_USER_VOTE("""
            DELETE FROM memeVotes WHERE memeId = :memeId AND userId = :userId
        """),

        INSERT_AWARD("""
            INSERT INTO memeVoteAwards (memeId, userId)
            VALUES (:memeId, :userId)
            ON CONFLICT (memeId, userId) DO NOTHING
        """),

        SHIFT_RATING("""
            UPDATE memes
            SET
                likes = GREATEST(0, likes + :likeDelta),
                dislikes = GREATEST(0, dislikes + :dislikeDelta),
                lastUpdated = :currentTime
            WHERE id = :id
        """),

        READ_COUNTS("""
            SELECT likes, dislikes FROM memes WHERE id = :id
        """),

        FIND_VOTE("""
            SELECT upVote FROM memeVotes WHERE memeId = :memeId AND userId = :userId
        """),

        FIND_VOTES_BY_USER("""
            SELECT v.memeId AS id, v.upVote
            FROM memeVotes v
            JOIN memes m ON m.id = v.memeId
            WHERE v.userId = :userId AND m.course = :course
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
