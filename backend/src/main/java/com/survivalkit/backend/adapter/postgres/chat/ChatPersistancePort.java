package com.survivalkit.backend.adapter.postgres.chat;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ChatPersistancePort {

    void saveMessage(ChatMessage message);

    void saveAttachment(ChatAttachmentMeta meta, byte[] data, String course, String authorUserId, Instant createdAt);

    void linkAttachments(String messageId, String authorUserId, String course, List<String> attachmentIds);

    List<ChatMessage> findMessagesByCourseSince(String course, Instant since);

    Optional<ChatAttachmentFile> findAttachment(String id, String course);

    boolean attachmentsBelongToUser(List<String> attachmentIds, String userId, String course);

    List<ChatAttachmentMeta> findAttachmentsByMessageIds(List<String> messageIds);

    void deleteAll();
}
