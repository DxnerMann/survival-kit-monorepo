package com.survivalkit.backend.adapter.postgres.chat;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;
import java.util.List;

public record ChatMessage(
        String id,
        String course,
        String authorUserId,
        String authorUsername,
        String text,
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        Instant createdAt,
        List<ChatAttachmentMeta> attachments,
        String clientId
) {
}
