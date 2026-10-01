package com.survivalkit.backend.adapter.postgres.guest;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class GuestRepository implements GuestPersistancePort {

    private final JdbcClient jdbcClient;

    public GuestRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void touch(String id) {
        jdbcClient.sql(Statements.TOUCH.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .update();
    }

    @Override
    public void delete(String id) {
        jdbcClient.sql(Statements.DELETE.sql)
                .paramSource(new MapSqlParameterSource("id", id))
                .update();
    }

    @Override
    public void deleteInactive() {
        jdbcClient.sql(Statements.DELETE_INACTIVE.sql).update();
    }

    @Override
    public List<Guest> findActive() {
        return jdbcClient.sql(Statements.FIND_ACTIVE.sql)
                .query(Guest.class)
                .list();
    }

    private enum Statements {
        // language=sql
        TOUCH("""
            INSERT INTO guests (id, firstSeen, lastSeen)
            VALUES (:id, now(), now())
            ON CONFLICT (id) DO UPDATE SET lastSeen = now()
        """),
        // language=sql
        DELETE("""
            DELETE FROM guests
            WHERE id = :id
        """),
        // language=sql
        DELETE_INACTIVE("""
            DELETE FROM guests
            WHERE lastSeen < now() - INTERVAL '7 days'
        """),
        // language=sql
        FIND_ACTIVE("""
            SELECT id, firstSeen, lastSeen
            FROM guests
            WHERE lastSeen > now() - INTERVAL '7 days'
            ORDER BY lastSeen DESC
        """);

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
