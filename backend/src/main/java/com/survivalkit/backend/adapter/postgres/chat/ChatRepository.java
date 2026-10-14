package com.survivalkit.backend.adapter.postgres.chat;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.survivalkit.backend.shared.Utils.toTimestamp;

@Repository
public class ChatRepository implements ChatPersistancePort {

    private final JdbcClient jdbcClient;

    public ChatRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public void saveMessage(ChatMessage message) {
        jdbcClient.sql(Statements.INSERT_MESSAGE.sql)
                .paramSource(new MapSqlParameterSource("id", message.id())
                        .addValue("course", message.course())
                        .addValue("authorUserId", message.authorUserId())
                        .addValue("authorUsername", message.authorUsername())
                        .addValue("body", message.text())
                        .addValue("createdAt", toTimestamp(message.createdAt()))
                        .addValue("replyToId", message.reply() == null ? null : message.reply().messageId())
                        .addValue("replyAuthorUserId", message.reply() == null ? null : message.reply().authorUserId())
                        .addValue("replyAuthorUsername", message.reply() == null ? null : message.reply().authorUsername())
                        .addValue("replyAuthorColor", message.reply() == null ? null : message.reply().authorColor())
                        .addValue("replyBody", message.reply() == null ? null : message.reply().text()))
                .update();
    }

    @Override
    public void saveAttachment(ChatAttachmentMeta meta, byte[] data, String course, String authorUserId, Instant createdAt) {
        jdbcClient.sql(Statements.INSERT_ATTACHMENT.sql)
                .paramSource(new MapSqlParameterSource("id", meta.id())
                        .addValue("messageId", meta.messageId())
                        .addValue("course", course)
                        .addValue("authorUserId", authorUserId)
                        .addValue("filename", meta.filename())
                        .addValue("contentType", meta.contentType())
                        .addValue("byteSize", meta.size())
                        .addValue("durationMs", meta.durationMs())
                        .addValue("kind", meta.kind())
                        .addValue("data", data)
                        .addValue("createdAt", toTimestamp(createdAt)))
                .update();
    }

    @Override
    public void linkAttachments(String messageId, String authorUserId, String course, List<String> attachmentIds) {
        if (attachmentIds == null || attachmentIds.isEmpty()) {
            return;
        }
        jdbcClient.sql(Statements.LINK_ATTACHMENTS.sql)
                .paramSource(new MapSqlParameterSource("messageId", messageId)
                        .addValue("authorUserId", authorUserId)
                        .addValue("course", course)
                        .addValue("ids", attachmentIds))
                .update();
    }

    @Override
    public List<ChatMessage> findMessagesByCourseSince(String course, Instant since) {
        var rows = jdbcClient.sql(Statements.GET_MESSAGES.sql)
                .paramSource(new MapSqlParameterSource("course", course)
                        .addValue("since", toTimestamp(since)))
                .query((rs, rowNum) -> mapMessage(rs, List.of()))
                .list();
        return hydrate(rows);
    }

    @Override
    public List<ChatMessage> findMessagesPage(
            String course,
            Instant since,
            Instant before,
            String beforeId,
            Instant after,
            String afterId,
            int limit
    ) {
        MapSqlParameterSource params = new MapSqlParameterSource("course", course)
                .addValue("since", toTimestamp(since))
                .addValue("limit", limit);
        String sql;
        boolean newestFirst;
        if (before != null) {
            sql = Statements.GET_MESSAGES_BEFORE.sql;
            newestFirst = true;
            params.addValue("before", toTimestamp(before))
                    .addValue("beforeId", beforeId == null ? "" : beforeId);
        } else if (after != null) {
            sql = Statements.GET_MESSAGES_AFTER.sql;
            newestFirst = false;
            params.addValue("after", toTimestamp(after))
                    .addValue("afterId", afterId == null ? "" : afterId);
        } else {
            sql = Statements.GET_MESSAGES_LATEST.sql;
            newestFirst = true;
        }

        var rows = jdbcClient.sql(sql)
                .paramSource(params)
                .query((rs, rowNum) -> mapMessage(rs, List.of()))
                .list();
        var hydrated = hydrate(rows);
        if (!newestFirst) {
            return hydrated;
        }
        var chronological = new ArrayList<>(hydrated);
        Collections.reverse(chronological);
        return chronological;
    }

    @Override
    public Optional<ChatMessage> findMessageById(String id, String course, Instant since) {
        return jdbcClient.sql(Statements.GET_MESSAGE.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                        .addValue("course", course)
                        .addValue("since", toTimestamp(since)))
                .query((rs, rowNum) -> mapMessage(rs, List.of()))
                .optional();
    }

    @Override
    public Optional<ChatAttachmentFile> findAttachment(String id, String course) {
        return jdbcClient.sql(Statements.GET_ATTACHMENT.sql)
                .paramSource(new MapSqlParameterSource("id", id).addValue("course", course))
                .query((rs, rowNum) -> new ChatAttachmentFile(
                        rs.getString("id"),
                        rs.getString("filename"),
                        rs.getString("contentType"),
                        rs.getBytes("data")
                ))
                .optional();
    }

    @Override
    public boolean attachmentsBelongToUser(List<String> attachmentIds, String userId, String course) {
        if (attachmentIds == null || attachmentIds.isEmpty()) {
            return true;
        }
        Integer count = jdbcClient.sql(Statements.COUNT_OWN_UNLINKED.sql)
                .paramSource(new MapSqlParameterSource("ids", attachmentIds)
                        .addValue("authorUserId", userId)
                        .addValue("course", course))
                .query((rs, rowNum) -> rs.getInt(1))
                .optional()
                .orElse(0);
        return count == attachmentIds.size();
    }

    @Override
    public List<ChatAttachmentMeta> findAttachmentsByMessageIds(List<String> messageIds) {
        if (messageIds == null || messageIds.isEmpty()) {
            return List.of();
        }
        return jdbcClient.sql(Statements.GET_ATTACHMENTS_FOR_MESSAGES.sql)
                .paramSource(new MapSqlParameterSource("ids", messageIds))
                .query((rs, rowNum) -> new ChatAttachmentMeta(
                        rs.getString("id"),
                        rs.getString("messageId"),
                        rs.getString("filename"),
                        rs.getString("contentType"),
                        rs.getInt("byteSize"),
                        (Integer) rs.getObject("durationMs"),
                        rs.getString("kind")
                ))
                .list();
    }

    @Transactional
    @Override
    public void deleteAll() {
        jdbcClient.sql(Statements.DELETE_ATTACHMENTS.sql).update();
        jdbcClient.sql(Statements.DELETE_MESSAGES.sql).update();
    }

    private List<ChatMessage> hydrate(List<ChatMessage> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }

        var ids = rows.stream().map(ChatMessage::id).toList();
        var attachments = jdbcClient.sql(Statements.GET_ATTACHMENTS_FOR_MESSAGES.sql)
                .paramSource(new MapSqlParameterSource("ids", ids))
                .query((rs, rowNum) -> new ChatAttachmentMeta(
                        rs.getString("id"),
                        rs.getString("messageId"),
                        rs.getString("filename"),
                        rs.getString("contentType"),
                        rs.getInt("byteSize"),
                        (Integer) rs.getObject("durationMs"),
                        rs.getString("kind")
                ))
                .list();

        Map<String, List<ChatAttachmentMeta>> byMessage = attachments.stream()
                .collect(Collectors.groupingBy(ChatAttachmentMeta::messageId));
        Map<String, List<ChatReaction>> reactionsByMessage = findReactionsByMessageIds(ids).stream()
                .collect(Collectors.groupingBy(ReactionRow::messageId, Collectors.mapping(ReactionRow::reaction, Collectors.toList())));

        var result = new ArrayList<ChatMessage>(rows.size());
        for (var row : rows) {
            result.add(new ChatMessage(
                    row.id(),
                    row.course(),
                    row.authorUserId(),
                    row.authorUsername(),
                    row.authorColor(),
                    row.text(),
                    row.createdAt(),
                    byMessage.getOrDefault(row.id(), List.of()),
                    row.reply(),
                    row.clientId(),
                    reactionsByMessage.getOrDefault(row.id(), List.of())
            ));
        }
        return result;
    }

    @Override
    public void addReaction(String id, String messageId, String userId, String username, String emoji, Instant createdAt) {
        jdbcClient.sql(Statements.INSERT_REACTION.sql)
                .paramSource(new MapSqlParameterSource("id", id)
                        .addValue("messageId", messageId)
                        .addValue("userId", userId)
                        .addValue("username", username)
                        .addValue("emoji", emoji)
                        .addValue("createdAt", toTimestamp(createdAt)))
                .update();
    }

    @Override
    public void removeReaction(String messageId, String userId, String emoji) {
        jdbcClient.sql(Statements.DELETE_REACTION.sql)
                .paramSource(new MapSqlParameterSource("messageId", messageId)
                        .addValue("userId", userId)
                        .addValue("emoji", emoji))
                .update();
    }

    @Override
    public List<ChatReaction> findReactions(String messageId) {
        return findReactionsByMessageIds(List.of(messageId)).stream()
                .map(ReactionRow::reaction)
                .toList();
    }

    private List<ReactionRow> findReactionsByMessageIds(List<String> messageIds) {
        if (messageIds.isEmpty()) {
            return List.of();
        }
        return jdbcClient.sql(Statements.GET_REACTIONS.sql)
                .paramSource(new MapSqlParameterSource("ids", messageIds))
                .query((rs, rowNum) -> new ReactionRow(
                        rs.getString("messageId"),
                        new ChatReaction(
                                rs.getString("emoji"),
                                rs.getString("userId"),
                                rs.getString("username")
                        )
                ))
                .list();
    }

    private record ReactionRow(String messageId, ChatReaction reaction) {
    }

    private static Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static ChatMessage mapMessage(ResultSet rs, List<ChatAttachmentMeta> attachments) throws SQLException {
        return new ChatMessage(
                rs.getString("id"),
                rs.getString("course"),
                rs.getString("authorUserId"),
                rs.getString("authorUsername"),
                rs.getString("authorColor"),
                rs.getString("body"),
                toInstant(rs.getTimestamp("createdAt")),
                attachments,
                readReply(rs),
                null,
                List.of()
        );
    }

    private static ChatReply readReply(ResultSet rs) throws SQLException {
        var replyToId = rs.getString("replyToId");
        if (replyToId == null || replyToId.isBlank()) {
            return null;
        }
        return new ChatReply(
                replyToId,
                rs.getString("replyAuthorUserId"),
                rs.getString("replyAuthorUsername"),
                rs.getString("replyAuthorColor"),
                rs.getString("replyBody")
        );
    }

    private enum Statements {
        INSERT_MESSAGE("""
            INSERT INTO chatMessages (
                id, course, authorUserId, authorUsername, body, createdAt,
                replyToId, replyAuthorUserId, replyAuthorUsername, replyAuthorColor, replyBody
            )
            VALUES (
                :id, :course, :authorUserId, :authorUsername, :body, :createdAt,
                :replyToId, :replyAuthorUserId, :replyAuthorUsername, :replyAuthorColor, :replyBody
            )
            """),
        INSERT_ATTACHMENT("""
            INSERT INTO chatAttachments (
                id, messageId, course, authorUserId, filename, contentType,
                byteSize, durationMs, kind, data, createdAt
            )
            VALUES (
                :id, :messageId, :course, :authorUserId, :filename, :contentType,
                :byteSize, :durationMs, :kind, :data, :createdAt
            )
            """),
        LINK_ATTACHMENTS("""
            UPDATE chatAttachments
            SET messageId = :messageId
            WHERE id IN (:ids)
              AND authorUserId = :authorUserId
              AND TRIM(course) = TRIM(:course)
              AND messageId IS NULL
            """),
        GET_MESSAGES("""
            SELECT m.id, m.course, m.authorUserId, m.authorUsername, u.color AS authorColor, m.body, m.createdAt,
                   m.replyToId, m.replyAuthorUserId, m.replyAuthorUsername, m.replyAuthorColor, m.replyBody
            FROM chatMessages m
            LEFT JOIN users u ON u.id = m.authorUserId
            WHERE TRIM(m.course) = TRIM(:course) AND m.createdAt >= :since
            ORDER BY m.createdAt ASC
            """),
        GET_MESSAGES_LATEST("""
            SELECT m.id, m.course, m.authorUserId, m.authorUsername, u.color AS authorColor, m.body, m.createdAt,
                   m.replyToId, m.replyAuthorUserId, m.replyAuthorUsername, m.replyAuthorColor, m.replyBody
            FROM chatMessages m
            LEFT JOIN users u ON u.id = m.authorUserId
            WHERE TRIM(m.course) = TRIM(:course) AND m.createdAt >= :since
            ORDER BY m.createdAt DESC, m.id DESC
            LIMIT :limit
            """),
        GET_MESSAGES_BEFORE("""
            SELECT m.id, m.course, m.authorUserId, m.authorUsername, u.color AS authorColor, m.body, m.createdAt,
                   m.replyToId, m.replyAuthorUserId, m.replyAuthorUsername, m.replyAuthorColor, m.replyBody
            FROM chatMessages m
            LEFT JOIN users u ON u.id = m.authorUserId
            WHERE TRIM(m.course) = TRIM(:course) AND m.createdAt >= :since
              AND (m.createdAt < :before OR (m.createdAt = :before AND m.id < :beforeId))
            ORDER BY m.createdAt DESC, m.id DESC
            LIMIT :limit
            """),
        GET_MESSAGES_AFTER("""
            SELECT m.id, m.course, m.authorUserId, m.authorUsername, u.color AS authorColor, m.body, m.createdAt,
                   m.replyToId, m.replyAuthorUserId, m.replyAuthorUsername, m.replyAuthorColor, m.replyBody
            FROM chatMessages m
            LEFT JOIN users u ON u.id = m.authorUserId
            WHERE TRIM(m.course) = TRIM(:course) AND m.createdAt >= :since
              AND (m.createdAt > :after OR (m.createdAt = :after AND m.id > :afterId))
            ORDER BY m.createdAt ASC, m.id ASC
            LIMIT :limit
            """),
        GET_MESSAGE("""
            SELECT m.id, m.course, m.authorUserId, m.authorUsername, u.color AS authorColor, m.body, m.createdAt,
                   m.replyToId, m.replyAuthorUserId, m.replyAuthorUsername, m.replyAuthorColor, m.replyBody
            FROM chatMessages m
            LEFT JOIN users u ON u.id = m.authorUserId
            WHERE m.id = :id AND TRIM(m.course) = TRIM(:course) AND m.createdAt >= :since
            """),
        GET_ATTACHMENTS_FOR_MESSAGES("""
            SELECT id, messageId, filename, contentType, byteSize, durationMs, kind
            FROM chatAttachments
            WHERE messageId IN (:ids)
            ORDER BY createdAt ASC
            """),
        GET_ATTACHMENT("""
            SELECT id, filename, contentType, data
            FROM chatAttachments
            WHERE id = :id AND TRIM(course) = TRIM(:course)
            """),
        COUNT_OWN_UNLINKED("""
            SELECT COUNT(*)
            FROM chatAttachments
            WHERE id IN (:ids)
              AND authorUserId = :authorUserId
              AND TRIM(course) = TRIM(:course)
              AND messageId IS NULL
            """),
        DELETE_ATTACHMENTS("DELETE FROM chatAttachments"),
        DELETE_MESSAGES("DELETE FROM chatMessages"),
        INSERT_REACTION("""
            INSERT INTO chatReactions (id, messageId, userId, username, emoji, createdAt)
            VALUES (:id, :messageId, :userId, :username, :emoji, :createdAt)
            ON CONFLICT (messageId, userId, emoji) DO NOTHING
            """),
        DELETE_REACTION("""
            DELETE FROM chatReactions
            WHERE messageId = :messageId AND userId = :userId AND emoji = :emoji
            """),
        GET_REACTIONS("""
            SELECT messageId, emoji, userId, username
            FROM chatReactions
            WHERE messageId IN (:ids)
            ORDER BY createdAt ASC, id ASC
            """);

        private final String sql;

        Statements(String sql) {
            this.sql = sql;
        }
    }
}
