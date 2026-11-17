package com.survivalkit.backend.adapter.postgres.rank;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public class XpRepository {

    private final JdbcClient jdbcClient;

    public XpRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public Optional<XpGrant> grant(String userId, String action, String day, int amount, int cap) {
        var previous = jdbcClient.sql("SELECT COALESCE(xp, 0) FROM users WHERE id = :userId")
                .param("userId", userId)
                .query(Integer.class)
                .optional();
        if (previous.isEmpty()) {
            return Optional.empty();
        }
        var granted = jdbcClient.sql("""
                INSERT INTO userXpGrants (userId, action, day, count)
                VALUES (:userId, :action, :day, 1)
                ON CONFLICT (userId, action, day)
                DO UPDATE SET count = userXpGrants.count + 1
                WHERE userXpGrants.count < :cap
                """)
                .paramSource(new MapSqlParameterSource("userId", userId)
                        .addValue("action", action)
                        .addValue("day", day)
                        .addValue("cap", cap))
                .update();
        if (granted == 0) {
            return Optional.empty();
        }
        var updated = jdbcClient.sql("UPDATE users SET xp = COALESCE(xp, 0) + :amount WHERE id = :userId")
                .paramSource(new MapSqlParameterSource("userId", userId).addValue("amount", amount))
                .update();
        if (updated == 0) {
            return Optional.empty();
        }
        return Optional.of(new XpGrant(previous.get(), previous.get() + amount));
    }

    public List<XpRow> findByUsers(Collection<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        return jdbcClient.sql("""
                SELECT id, username, COALESCE(xp, 0) AS xp
                FROM users
                WHERE id IN (:userIds)
                """)
                .param("userIds", userIds)
                .query((rs, rowNum) -> new XpRow(
                        rs.getString("id"),
                        rs.getString("username"),
                        rs.getInt("xp")
                ))
                .list();
    }

    public record XpRow(String userId, String username, int xp) {
    }

    public record XpGrant(int previousXp, int xp) {
    }
}
