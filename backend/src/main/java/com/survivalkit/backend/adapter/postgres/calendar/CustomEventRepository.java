package com.survivalkit.backend.adapter.postgres.calendar;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static com.survivalkit.backend.shared.Utils.toTimestamp;

@Repository
public class CustomEventRepository implements CustomEventPersistancePort {

    private final JdbcClient jdbcClient;

    public CustomEventRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void save(StoredCustomEvent event, Instant createdAt) {
        jdbcClient.sql(Statements.SAVE.sql)
                .paramSource(new MapSqlParameterSource("id", event.id())
                        .addValue("ownerUserId", event.ownerUserId())
                        .addValue("title", event.title())
                        .addValue("eventDate", event.eventDate())
                        .addValue("startTime", event.startTime())
                        .addValue("endTime", event.endTime())
                        .addValue("room", event.room())
                        .addValue("description", event.description())
                        .addValue("createdAt", toTimestamp(createdAt)))
                .update();
    }

    @Override
    public void saveInvite(CustomEventInvite invite, Instant createdAt) {
        jdbcClient.sql(Statements.SAVE_INVITE.sql)
                .paramSource(new MapSqlParameterSource("id", invite.id())
                        .addValue("eventId", invite.eventId())
                        .addValue("inviteeUserId", invite.inviteeUserId())
                        .addValue("status", invite.status())
                        .addValue("activityId", invite.activityId())
                        .addValue("createdAt", toTimestamp(createdAt)))
                .update();
    }

    @Override
    public List<StoredCustomEvent> findVisible(String userId) {
        return jdbcClient.sql(Statements.FIND_VISIBLE.sql)
                .param("userId", userId)
                .query(CustomEventRepository::mapEvent)
                .list();
    }

    @Override
    public Optional<CustomEventInvite> findInvite(String eventId, String userId) {
        return jdbcClient.sql(Statements.FIND_INVITE.sql)
                .paramSource(new MapSqlParameterSource("eventId", eventId)
                        .addValue("userId", userId))
                .query(CustomEventRepository::mapInvite)
                .optional();
    }

    @Override
    public int markInvite(String eventId, String userId, String status) {
        return jdbcClient.sql(Statements.MARK_INVITE.sql)
                .paramSource(new MapSqlParameterSource("eventId", eventId)
                        .addValue("userId", userId)
                        .addValue("status", status))
                .update();
    }

    private static StoredCustomEvent mapEvent(ResultSet rs, int rowNum) throws SQLException {
        return new StoredCustomEvent(
                rs.getString("id"),
                rs.getString("ownerUserId"),
                rs.getString("title"),
                rs.getString("eventDate"),
                rs.getString("startTime"),
                rs.getString("endTime"),
                rs.getString("room"),
                rs.getString("description")
        );
    }

    private static CustomEventInvite mapInvite(ResultSet rs, int rowNum) throws SQLException {
        return new CustomEventInvite(
                rs.getString("id"),
                rs.getString("eventId"),
                rs.getString("inviteeUserId"),
                rs.getString("status"),
                rs.getString("activityId")
        );
    }

    private enum Statements {
        SAVE("""
            INSERT INTO customEvents (id, ownerUserId, title, eventDate, startTime, endTime, room, description, createdAt)
            VALUES (:id, :ownerUserId, :title, :eventDate, :startTime, :endTime, :room, :description, :createdAt)
        """),
        SAVE_INVITE("""
            INSERT INTO customEventInvites (id, eventId, inviteeUserId, status, activityId, createdAt)
            VALUES (:id, :eventId, :inviteeUserId, :status, :activityId, :createdAt)
        """),
        FIND_VISIBLE("""
            SELECT id, ownerUserId, title, eventDate, startTime, endTime, room, description
            FROM customEvents
            WHERE ownerUserId = :userId
               OR id IN (
                    SELECT eventId
                    FROM customEventInvites
                    WHERE inviteeUserId = :userId
                      AND status = 'ACCEPTED'
               )
            ORDER BY eventDate, startTime
        """),
        FIND_INVITE("""
            SELECT id, eventId, inviteeUserId, status, activityId
            FROM customEventInvites
            WHERE eventId = :eventId AND inviteeUserId = :userId
        """),
        MARK_INVITE("""
            UPDATE customEventInvites
            SET status = :status
            WHERE eventId = :eventId
              AND inviteeUserId = :userId
              AND status = 'PENDING'
        """);

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
