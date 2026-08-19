package com.survivalkit.backend.core.chat;

import com.survivalkit.backend.adapter.postgres.chat.ChatAttachmentFile;
import com.survivalkit.backend.adapter.postgres.chat.ChatAttachmentMeta;
import com.survivalkit.backend.adapter.postgres.chat.ChatMessage;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ChatPort {

    List<ChatMessage> getTodaysMessages();

    ChatAttachmentMeta uploadAttachment(MultipartFile file, Integer durationMs);

    ChatAttachmentFile getAttachment(String id);

    ChatMessage postMessage(
            String userId,
            String username,
            String course,
            String text,
            List<String> attachmentIds,
            String clientId
    );

    void deleteAll();
}
