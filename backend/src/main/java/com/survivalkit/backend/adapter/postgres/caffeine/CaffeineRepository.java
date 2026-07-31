package com.survivalkit.backend.adapter.postgres.caffeine;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import static com.survivalkit.backend.shared.Utils.toTimestamp;

@Repository
public class CaffeineRepository implements CaffeinePersistancePort {

    private final JdbcClient jdbcClient;

    public CaffeineRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void save(CaffeineEntry entry) {
        jdbcClient.sql(Statements.SAVE.sql)
                .paramSource(new MapSqlParameterSource("id", entry.id())
                        .addValue("userId", entry.userId())
                        .addValue("source", entry.source())
                        .addValue("amountMg", entry.amountMg())
                        .addValue("consumedAt", toTimestamp(entry.consumedAt())))
                .update();
    }

    @Override
    public List<CaffeineEntry> getTodayForUser(String userId) {
        return jdbcClient.sql(Statements.GET_TODAY_FOR_USER.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .query(CaffeineEntry.class)
                .list();
    }

    @Override
    public List<CaffeineEntry> getLast7DaysForUser(String userId) {
        return jdbcClient.sql(Statements.GET_LAST_7_DAYS_FOR_USER.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .query(CaffeineEntry.class)
                .list();
    }

    @Override
    public List<CaffeineEntry> getLast7DaysForCourse(String course) {
        return jdbcClient.sql(Statements.GET_LAST_7_DAYS_FOR_COURSE.sql)
                .paramSource(new MapSqlParameterSource("course", course))
                .query(CaffeineEntry.class)
                .list();
    }

    @Override
    public List<CaffeineEntry> getLast7DaysGlobal() {
        return jdbcClient.sql(Statements.GET_LAST_7_DAYS_GLOBAL.sql)
                .query(CaffeineEntry.class)
                .list();
    }

    @Override
    public Optional<Double> getAverageForUser(String userId) {
        return jdbcClient.sql(Statements.AVG_FOR_USER.sql)
                .paramSource(new MapSqlParameterSource("userId", userId))
                .query(Double.class)
                .optional();
    }

    @Override
    public Optional<Double> getAverageForCourse(String course) {
        return jdbcClient.sql(Statements.AVG_FOR_COURSE.sql)
                .paramSource(new MapSqlParameterSource("course", course))
                .query(Double.class)
                .optional();
    }

    @Override
    public Optional<Double> getAverageGlobal() {
        return jdbcClient.sql(Statements.AVG_GLOBAL.sql)
                .query(Double.class)
                .optional();
    }

    @Override
    public boolean deleteForUser(String id, String userId) {
        int updated = jdbcClient.sql(Statements.DELETE_FOR_USER.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                        .addValue("userId", userId))
                .update();
        return updated > 0;
    }

    @Override
    public void deleteOlderThan7Days() {
        jdbcClient.sql(Statements.DELETE_OLDER_THAN_7_DAYS.sql).update();
    }

    private enum Statements {
        // language=sql
        SAVE("""
            INSERT INTO caffeineEntries (id, userId, source, amountMg, consumedAt)
            VALUES (:id, :userId, :source, :amountMg, :consumedAt)
        """),
        // language=sql
        GET_TODAY_FOR_USER("""
            SELECT id, userId, source, amountMg, consumedAt
            FROM caffeineEntries
            WHERE userId = :userId
              AND (consumedAt AT TIME ZONE 'Europe/Berlin')::date
                  = (now() AT TIME ZONE 'Europe/Berlin')::date
            ORDER BY consumedAt ASC
        """),
        // language=sql
        GET_LAST_7_DAYS_FOR_USER("""
            SELECT id, userId, source, amountMg, consumedAt
            FROM caffeineEntries
            WHERE userId = :userId
              AND consumedAt > (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
            ORDER BY consumedAt ASC
        """),
        // language=sql
        GET_LAST_7_DAYS_FOR_COURSE("""
            SELECT c.id, c.userId, c.source, c.amountMg, c.consumedAt
            FROM caffeineEntries c
            LEFT JOIN users u ON u.id = c.userId
            WHERE u.course = :course
              AND c.consumedAt > (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
            ORDER BY c.consumedAt ASC
        """),
        // language=sql
        GET_LAST_7_DAYS_GLOBAL("""
            SELECT id, userId, source, amountMg, consumedAt
            FROM caffeineEntries
            WHERE consumedAt > (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
            ORDER BY consumedAt ASC
        """),
        // language=sql
        AVG_FOR_USER("""
            SELECT AVG(amountMg)
            FROM caffeineEntries
            WHERE userId = :userId
              AND consumedAt > (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
        """),
        // language=sql
        AVG_FOR_COURSE("""
            SELECT AVG(c.amountMg)
            FROM caffeineEntries c
            LEFT JOIN users u ON u.id = c.userId
            WHERE u.course = :course
              AND c.consumedAt > (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
        """),
        // language=sql
        AVG_GLOBAL("""
            SELECT AVG(amountMg)
            FROM caffeineEntries
            WHERE consumedAt > (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
        """),
        // language=sql
        DELETE_FOR_USER("""
            DELETE FROM caffeineEntries
            WHERE id = :id AND userId = :userId
        """),
        // language=sql
        DELETE_OLDER_THAN_7_DAYS("""
            DELETE FROM caffeineEntries
            WHERE consumedAt < (now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
        """);

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
