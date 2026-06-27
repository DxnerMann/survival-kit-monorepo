package com.survivalkit.backend.adapter.postgres.usetracking;

import com.survivalkit.backend.shared.Page;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import static com.survivalkit.backend.shared.ContinuationTokenHelper.decode;
import static com.survivalkit.backend.shared.ContinuationTokenHelper.encode;
import static com.survivalkit.backend.shared.Utils.toTimestamp;

@Repository
public class UserTrackingRepository implements UserTrackingPersistancePort{

    private final JdbcClient jdbcClient;

    public UserTrackingRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void saveTrackAction(TrackAction action) {
        jdbcClient.sql(Statements.SAVE.sql)
                .paramSource(new MapSqlParameterSource("id", action.id())
                        .addValue("type", action.type().toString())
                        .addValue("userIdIfUser", action.userIdIfUser())
                        .addValue("timestamp", toTimestamp(action.timestamp()))
                ).update();
    }

    @Override
    public Page<TrackAction> getUserActionsLast7Days(String userId, TrackAction.Action actionType, String continuation) {
        var actions = jdbcClient.sql(Statements.GET_USER_ACTIONS_7_DAYS.sql)
                .paramSource(new MapSqlParameterSource("userId", userId)
                        .addValue("actionType", actionType.toString())
                        .addValue("continuation", decode(continuation))
                ).query(TrackAction.class).list();

        if (actions.isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }

        return new Page<>(
                actions,
                encode(actions.getLast().id())
        );
    }

    @Override
    public Page<TrackAction> getCourseActionsLast7Days(String course, TrackAction.Action actionType, String continuation) {
        var actions = jdbcClient.sql(Statements.GET_COURSE_ACTIONS_7_DAYS.sql)
                .paramSource(new MapSqlParameterSource("course", course)
                        .addValue("actionType", actionType.toString())
                        .addValue("continuation", decode(continuation))
                ).query(TrackAction.class).list();

        if (actions.isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }

        return new Page<>(
                actions,
                encode(actions.getLast().id())
        );
    }

    @Override
    public Page<TrackAction> getGlobalActionsLast7Days(TrackAction.Action actionType, String continuation) {
        var actions = jdbcClient.sql(Statements.GET_GLOBAL_ACTIONS_7_DAYS.sql)
                .paramSource(new MapSqlParameterSource("actionType", actionType.toString())
                        .addValue("continuation", decode(continuation))
                ).query(TrackAction.class).list();

        if (actions.isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }

        return new Page<>(
                actions,
                encode(actions.getLast().id())
        );
    }

    @Override
    public Optional<Integer> getActionSumForUser(String userId, TrackAction.Action target) {
        return jdbcClient.sql(Statements.GET_USER_ACTION_SUM.sql)
                .paramSource(new MapSqlParameterSource("userId", userId)
                        .addValue("actionType", target.toString())
                ).query(Integer.class)
                .optional();
    }

    @Override
    public Optional<Integer> getActionSumForCourse(String course, TrackAction.Action target) {
        return jdbcClient.sql(Statements.GET_COURSE_ACTION_SUM.sql)
                .paramSource(new MapSqlParameterSource("course", course)
                        .addValue("actionType", target.toString())
                ).query(Integer.class)
                .optional();
    }

    @Override
    public Optional<Integer> getGolbalActionSum(TrackAction.Action target) {
        return jdbcClient.sql(Statements.GET_GLOBAL_ACTION_SUM.sql)
                .paramSource(new MapSqlParameterSource("actionType", target.toString()))
                .query(Integer.class)
                .optional();
    }

    @Override
    public void deleteOlderThanOneMonth() {
        jdbcClient.sql(Statements.DELETE_OLDER_THAN_ONE_MONTH.sql).update();
    }

    public enum Statements {

        // language=sql
        SAVE("""
            INSERT INTO trackActions (id, type, userIdIfUser, timestamp) 
            VALUES (:id, :type, :userIdIfUser, :timestamp)
            ON CONFLICT (timestamp) DO NOTHING
        """),
        // language=sql
        GET_USER_ACTIONS_7_DAYS("""
            SELECT
                ta.id,
                ta.type,
                ta.userIdIfUser,
                u.course AS courseIfUser,
                ta.timestamp
            FROM trackActions ta
            LEFT JOIN users u
                ON u.id = ta.userIdIfUser
            WHERE ta.userIdIfUser = :userId
                AND ta.type = :actionType
                AND ta.timestamp > (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
                AND (:continuation::TEXT IS NULL OR ta.id > :continuation)
            ORDER BY ta.id
            LIMIT 50;
        """),
        // language=sql
        GET_COURSE_ACTIONS_7_DAYS("""
            SELECT
                ta.id,
                ta.type,
                ta.userIdIfUser,
                u.course AS courseIfUser,
                ta.timestamp
            FROM trackActions ta
            LEFT JOIN users u
                ON u.id = ta.userIdIfUser
            WHERE u.course = :course
                AND ta.type = :actionType
                AND ta.timestamp > (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
                AND (:continuation::TEXT IS NULL OR ta.id > :continuation)
            ORDER BY ta.id
            LIMIT 50;
        """),
        // language=sql
        GET_GLOBAL_ACTIONS_7_DAYS("""
            SELECT
                ta.id,
                ta.type,
                ta.userIdIfUser,
                u.course AS courseIfUser,
                ta.timestamp
            FROM trackActions ta
            LEFT JOIN users u
                ON u.id = ta.userIdIfUser
            WHERE ta.type = :actionType
                AND ta.timestamp > (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
                AND (:continuation::TEXT IS NULL OR ta.id > :continuation)
            ORDER BY ta.id
            LIMIT 50;
        """),
        // language=sql
        GET_USER_ACTION_SUM("""
            SELECT COUNT(*)
            FROM trackActions
            WHERE userIdIfUser = :userId
                AND type = :actionType
        """),
        // language=sql
        GET_COURSE_ACTION_SUM("""
            SELECT COUNT(ta.userIdIfUser)
            FROM trackActions ta
            LEFT JOIN users u
                ON u.id = ta.userIdIfUser
            WHERE u.course = :course
                AND ta.type = :actionType;
        """),
        // language=sql
        GET_GLOBAL_ACTION_SUM("""
            SELECT COUNT(*)
            FROM trackActions
            WHERE type = :actionType
        """),
        // language=sql
        DELETE_OLDER_THAN_ONE_MONTH("""
            DELETE FROM trackActions
            WHERE timestamp < (now() AT TIME ZONE 'UTC') - INTERVAL '1 month'
        """);

        private String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
