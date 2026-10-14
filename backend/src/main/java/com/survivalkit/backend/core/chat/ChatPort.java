package com.survivalkit.backend.core.chat;

import com.survivalkit.backend.adapter.postgres.chat.ChatAttachmentFile;
import com.survivalkit.backend.adapter.postgres.chat.ChatAttachmentMeta;
import com.survivalkit.backend.adapter.postgres.chat.ChatMessage;
import com.survivalkit.backend.adapter.postgres.chat.ChatReactionUpdate;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

public interface ChatPort {

    List<ChatMessage> getTodaysMessages(Instant before, String beforeId, Instant after, String afterId, int limit);

    ChatAttachmentMeta uploadAttachment(MultipartFile file, Integer durationMs);

    ChatAttachmentFile getAttachment(String id);

    ChatMessage postMessage(
            String userId,
            String username,
            String course,
            String text,
            List<String> attachmentIds,
            String clientId,
            String replyToId
    );

    ChatMessage postCurrentUserMessage(String text, List<String> attachmentIds, String clientId, String replyToId);

    ChatReactionUpdate addReaction(String messageId, String emoji);

    ChatReactionUpdate removeReaction(String messageId, String emoji);

    List<String> listCourseUsernames();

    void deleteAll();
}
