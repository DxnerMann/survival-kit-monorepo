package com.survivalkit.backend.adapter.postgres.presentationgame;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static com.survivalkit.backend.shared.Utils.toTimestamp;

@Repository
public class PresentationGameRepository implements PresentationGamePersistancePort {

    private final JdbcClient jdbcClient;

    public PresentationGameRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void createRoom(PresentationGameRoom room) {
        jdbcClient.sql(Statements.INSERT_ROOM.sql)
                .paramSource(new MapSqlParameterSource("id", room.id())
                        .addValue("name", room.name())
                        .addValue("hostUserId", room.hostUserId())
                        .addValue("hostUsername", room.hostUsername())
                        .addValue("course", room.course())
                        .addValue("isPublic", room.isPublic())
                        .addValue("joinCode", room.joinCode())
                        .addValue("difficulty", room.difficulty().name())
                        .addValue("status", room.status().name())
                        .addValue("createdAt", toTimestamp(room.createdAt()))
                        .addValue("presenterPoints", room.presenterPoints())
                ).update();
    }

    @Override
    public void addMember(String roomId, String userId, String username) {
        jdbcClient.sql(Statements.INSERT_MEMBER.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("userId", userId)
                        .addValue("username", username)
                        .addValue("joinedAt", toTimestamp(Instant.now()))
                ).update();
    }

    @Override
    public boolean isMember(String roomId, String userId) {
        var count = jdbcClient.sql(Statements.COUNT_MEMBER.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("userId", userId)
                ).query(Integer.class)
                .single();
        return count != null && count > 0;
    }

    @Override
    public Optional<PresentationGameRoom> findById(String id) {
        return jdbcClient.sql(Statements.FIND_BY_ID.sql)
                .param("id", id)
                .query(PresentationGameRoom.class)
                .optional();
    }

    @Override
    public Optional<PresentationGameRoom> findByJoinCode(String joinCode) {
        return jdbcClient.sql(Statements.FIND_BY_CODE.sql)
                .param("joinCode", joinCode.trim().toUpperCase())
                .query(PresentationGameRoom.class)
                .optional();
    }

    @Override
    public List<PresentationGameRoomListItem> findPublicLobbyRoomsForCourse(String course) {
        return jdbcClient.sql(Statements.FIND_PUBLIC_LOBBY_FOR_COURSE.sql)
                .param("course", course)
                .query(PresentationGameRoomListItem.class)
                .list();
    }

    @Override
    public List<PresentationGameRoomMember> findMembers(String roomId) {
        return jdbcClient.sql(Statements.FIND_MEMBERS.sql)
                .param("roomId", roomId)
                .query(PresentationGameRoomMember.class)
                .list();
    }

    @Override
    public List<PresentationGameFinishedItem> findFinishedGames(String course, int limit) {
        return jdbcClient.sql(Statements.FIND_FINISHED.sql)
                .paramSource(new MapSqlParameterSource("course", course)
                        .addValue("limit", limit)
                ).query(PresentationGameFinishedItem.class)
                .list();
    }

    @Override
    public void startRoom(String roomId, Instant startedAt) {
        jdbcClient.sql(Statements.START_ROOM.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("startedAt", toTimestamp(startedAt))
                ).update();
    }

    @Override
    public void finishRoom(String roomId, Instant finishedAt, int presenterPoints) {
        jdbcClient.sql(Statements.FINISH_ROOM.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("finishedAt", toTimestamp(finishedAt))
                        .addValue("presenterPoints", presenterPoints)
                ).update();
    }

    @Override
    public void deleteAllRooms() {
        jdbcClient.sql(Statements.DELETE_ALL.sql).update();
    }

    @Override
    public void saveWords(String roomId, List<String> words) {
        appendWords(roomId, words, 0);
    }

    @Override
    public void appendWords(String roomId, List<String> words, int startIndex) {
        for (int i = 0; i < words.size(); i++) {
            jdbcClient.sql(Statements.INSERT_WORD.sql)
                    .paramSource(new MapSqlParameterSource("roomId", roomId)
                            .addValue("wordIndex", startIndex + i)
                            .addValue("word", words.get(i))
                    ).update();
        }
    }

    @Override
    public List<String> findAllWordTexts(String roomId) {
        return jdbcClient.sql(Statements.FIND_ALL_WORDS.sql)
                .param("roomId", roomId)
                .query(String.class)
                .list();
    }

    @Override
    public Optional<String> findWord(String roomId, int wordIndex) {
        return jdbcClient.sql(Statements.FIND_WORD.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("wordIndex", wordIndex)
                ).query(String.class)
                .optional();
    }

    @Override
    public int countWords(String roomId) {
        var count = jdbcClient.sql(Statements.COUNT_WORDS.sql)
                .param("roomId", roomId)
                .query(Integer.class)
                .single();
        return count == null ? 0 : count;
    }

    @Override
    public boolean hasVoted(String roomId, int wordIndex, String userId) {
        var count = jdbcClient.sql(Statements.COUNT_VOTE.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("wordIndex", wordIndex)
                        .addValue("userId", userId)
                ).query(Integer.class)
                .single();
        return count != null && count > 0;
    }

    @Override
    public void addVote(String roomId, int wordIndex, String userId, String voteType) {
        jdbcClient.sql(Statements.INSERT_VOTE.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("wordIndex", wordIndex)
                        .addValue("userId", userId)
                        .addValue("voteType", voteType)
                        .addValue("votedAt", toTimestamp(Instant.now()))
                ).update();
    }

    @Override
    public List<String> findApprovingUserIds(String roomId, int wordIndex) {
        return jdbcClient.sql(Statements.FIND_APPROVALS.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("wordIndex", wordIndex)
                ).query(String.class)
                .list();
    }

    @Override
    public int countApprovals(String roomId, int wordIndex) {
        var count = jdbcClient.sql(Statements.COUNT_APPROVALS.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("wordIndex", wordIndex)
                ).query(Integer.class)
                .single();
        return count == null ? 0 : count;
    }

    @Override
    public boolean advanceWord(String roomId, int expectedWordIndex, int pointsDelta) {
        var updated = jdbcClient.sql(Statements.ADVANCE_WORD.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("expectedWordIndex", expectedWordIndex)
                        .addValue("pointsDelta", pointsDelta)
                ).update();
        return updated > 0;
    }

    @Override
    public void updatePresenterPoints(String roomId, int pointsDelta) {
        jdbcClient.sql(Statements.UPDATE_POINTS.sql)
                .paramSource(new MapSqlParameterSource("roomId", roomId)
                        .addValue("pointsDelta", pointsDelta)
                ).update();
    }

    private enum Statements {
        INSERT_ROOM(
                """
                    INSERT INTO presentation_game_rooms
                    (id, name, host_user_id, host_username, course, is_public, join_code, difficulty,
                     status, created_at, presenter_points, current_word_index)
                    VALUES (:id, :name, :hostUserId, :hostUsername, :course, :isPublic, :joinCode, :difficulty,
                            :status, :createdAt, :presenterPoints, 0)
                    """
        ),
        INSERT_MEMBER(
                """
                    INSERT INTO presentation_game_room_members (room_id, user_id, username, joined_at)
                    VALUES (:roomId, :userId, :username, :joinedAt)
                    ON CONFLICT (room_id, user_id) DO UPDATE SET username = EXCLUDED.username
                    """
        ),
        COUNT_MEMBER(
                """
                    SELECT COUNT(*) FROM presentation_game_room_members
                    WHERE room_id = :roomId AND user_id = :userId
                    """
        ),
        FIND_BY_ID(
                """
                    SELECT id, name, host_user_id AS hostUserId, host_username AS hostUsername,
                           course, is_public AS isPublic, join_code AS joinCode,
                           difficulty, status, created_at AS createdAt,
                           started_at AS startedAt, finished_at AS finishedAt,
                           presenter_points AS presenterPoints,
                           current_word_index AS currentWordIndex
                    FROM presentation_game_rooms
                    WHERE id = :id
                    """
        ),
        FIND_BY_CODE(
                """
                    SELECT id, name, host_user_id AS hostUserId, host_username AS hostUsername,
                           course, is_public AS isPublic, join_code AS joinCode,
                           difficulty, status, created_at AS createdAt,
                           started_at AS startedAt, finished_at AS finishedAt,
                           presenter_points AS presenterPoints,
                           current_word_index AS currentWordIndex
                    FROM presentation_game_rooms
                    WHERE join_code = :joinCode
                    """
        ),
        FIND_PUBLIC_LOBBY_FOR_COURSE(
                """
                    SELECT r.id,
                           r.name,
                           r.host_username AS hostUsername,
                           r.difficulty,
                           (
                               SELECT COUNT(*)::int
                               FROM presentation_game_room_members m
                               WHERE m.room_id = r.id AND m.user_id <> r.host_user_id
                           ) AS jurySize
                    FROM presentation_game_rooms r
                    WHERE r.is_public = true
                      AND r.course = :course
                      AND r.status = 'LOBBY'
                    ORDER BY r.created_at DESC
                    """
        ),
        FIND_MEMBERS(
                """
                    SELECT m.user_id AS userId,
                           m.username,
                           (m.user_id = r.host_user_id) AS host
                    FROM presentation_game_room_members m
                    JOIN presentation_game_rooms r ON r.id = m.room_id
                    WHERE m.room_id = :roomId
                    ORDER BY (m.user_id = r.host_user_id) DESC, m.joined_at ASC
                    """
        ),
        FIND_FINISHED(
                """
                    SELECT r.id,
                           r.name,
                           r.host_username AS hostUsername,
                           r.presenter_points AS presenterPoints,
                           r.finished_at AS finishedAt
                    FROM presentation_game_rooms r
                    WHERE r.status = 'FINISHED'
                      AND (
                          (:course = '' AND r.is_public = true)
                          OR (:course <> '' AND (r.course = :course OR r.is_public = true))
                      )
                    ORDER BY r.finished_at DESC
                    LIMIT :limit
                    """
        ),
        START_ROOM(
                """
                    UPDATE presentation_game_rooms
                    SET status = 'IN_PROGRESS', started_at = :startedAt, current_word_index = 0, presenter_points = 0
                    WHERE id = :roomId
                    """
        ),
        FINISH_ROOM(
                """
                    UPDATE presentation_game_rooms
                    SET status = 'FINISHED', finished_at = :finishedAt, presenter_points = :presenterPoints
                    WHERE id = :roomId
                    """
        ),
        DELETE_ALL(
                """
                    DELETE FROM presentation_game_rooms
                    """
        ),
        INSERT_WORD(
                """
                    INSERT INTO presentation_game_room_words (room_id, word_index, word)
                    VALUES (:roomId, :wordIndex, :word)
                    """
        ),
        FIND_WORD(
                """
                    SELECT word FROM presentation_game_room_words
                    WHERE room_id = :roomId AND word_index = :wordIndex
                    """
        ),
        FIND_ALL_WORDS(
                """
                    SELECT word FROM presentation_game_room_words
                    WHERE room_id = :roomId
                    ORDER BY word_index ASC
                    """
        ),
        COUNT_WORDS(
                """
                    SELECT COUNT(*)::int FROM presentation_game_room_words
                    WHERE room_id = :roomId
                    """
        ),
        INSERT_VOTE(
                """
                    INSERT INTO presentation_game_word_votes (room_id, word_index, user_id, vote_type, voted_at)
                    VALUES (:roomId, :wordIndex, :userId, :voteType, :votedAt)
                    ON CONFLICT (room_id, word_index, user_id) DO NOTHING
                    """
        ),
        COUNT_VOTE(
                """
                    SELECT COUNT(*) FROM presentation_game_word_votes
                    WHERE room_id = :roomId AND word_index = :wordIndex AND user_id = :userId
                    """
        ),
        FIND_APPROVALS(
                """
                    SELECT user_id FROM presentation_game_word_votes
                    WHERE room_id = :roomId AND word_index = :wordIndex AND vote_type = 'APPROVE'
                    """
        ),
        COUNT_APPROVALS(
                """
                    SELECT COUNT(*)::int FROM presentation_game_word_votes
                    WHERE room_id = :roomId AND word_index = :wordIndex AND vote_type = 'APPROVE'
                    """
        ),
        ADVANCE_WORD(
                """
                    UPDATE presentation_game_rooms
                    SET current_word_index = current_word_index + 1,
                        presenter_points = presenter_points + :pointsDelta
                    WHERE id = :roomId
                      AND current_word_index = :expectedWordIndex
                      AND status = 'IN_PROGRESS'
                    """
        ),
        UPDATE_POINTS(
                """
                    UPDATE presentation_game_rooms
                    SET presenter_points = presenter_points + :pointsDelta
                    WHERE id = :roomId AND status = 'IN_PROGRESS'
                    """
        );

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
