package com.survivalkit.backend.adapter.postgres.chat;

import com.fasterxml.jackson.annotation.JsonIgnore;

public record ChatAttachmentMeta(
        String id,
        @JsonIgnore String messageId,
        String filename,
        String contentType,
        int size,
        Integer durationMs,
        String kind
) {
}
