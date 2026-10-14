package com.survivalkit.backend.adapter.postgres.chat;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ChatPersistancePort {

    void saveMessage(ChatMessage message);

    void saveAttachment(ChatAttachmentMeta meta, byte[] data, String course, String authorUserId, Instant createdAt);

    void linkAttachments(String messageId, String authorUserId, String course, List<String> attachmentIds);

    List<ChatMessage> findMessagesByCourseSince(String course, Instant since);

    List<ChatMessage> findMessagesPage(
            String course,
            Instant since,
            Instant before,
            String beforeId,
            Instant after,
            String afterId,
            int limit
    );

    Optional<ChatMessage> findMessageById(String id, String course, Instant since);

    Optional<ChatAttachmentFile> findAttachment(String id, String course);

    boolean attachmentsBelongToUser(List<String> attachmentIds, String userId, String course);

    List<ChatAttachmentMeta> findAttachmentsByMessageIds(List<String> messageIds);

    void addReaction(String id, String messageId, String userId, String username, String emoji, Instant createdAt);

    void removeReaction(String messageId, String userId, String emoji);

    List<ChatReaction> findReactions(String messageId);

    void deleteAll();
}
