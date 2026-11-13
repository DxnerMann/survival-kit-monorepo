package com.survivalkit.backend.adapter.postgres.activity;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

import static com.survivalkit.backend.shared.Utils.toInstant;
import static com.survivalkit.backend.shared.Utils.toTimestamp;

@Repository
public class UserActivityRepository implements UserActivityPersistancePort {

    private final JdbcClient jdbcClient;

    public UserActivityRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void save(UserActivity activity) {
        jdbcClient.sql(Statements.SAVE.sql)
                .paramSource(new MapSqlParameterSource("id", activity.id())
                        .addValue("userId", activity.userId())
                        .addValue("kind", activity.kind())
                        .addValue("title", activity.title())
                        .addValue("actorUsername", activity.actorUsername())
                        .addValue("subjectId", activity.subjectId())
                        .addValue("createdAt", toTimestamp(activity.createdAt())))
                .update();
    }

    @Override
    public List<UserActivity> findByUser(String userId) {
        return jdbcClient.sql(Statements.FIND_BY_USER.sql)
                .param("userId", userId)
                .query(UserActivityRepository::map)
                .list();
    }

    private static UserActivity map(ResultSet rs, int rowNum) throws SQLException {
        return new UserActivity(
                rs.getString("id"),
                rs.getString("userId"),
                rs.getString("kind"),
                rs.getString("title"),
                rs.getString("actorUsername"),
                rs.getString("subjectId"),
                toInstant(rs.getTimestamp("createdAt"))
        );
    }

    private enum Statements {
        SAVE("""
            INSERT INTO userActivities (id, userId, kind, title, actorUsername, subjectId, createdAt)
            VALUES (:id, :userId, :kind, :title, :actorUsername, :subjectId, :createdAt)
        """),
        FIND_BY_USER("""
            SELECT id, userId, kind, title, actorUsername, subjectId, createdAt
            FROM userActivities
            WHERE userId = :userId
            ORDER BY createdAt DESC
            LIMIT 30
        """);

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
