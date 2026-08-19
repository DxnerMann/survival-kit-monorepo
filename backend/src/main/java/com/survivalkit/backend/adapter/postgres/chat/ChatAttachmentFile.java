package com.survivalkit.backend.adapter.postgres.chat;

public record ChatAttachmentFile(
        String id,
        String filename,
        String contentType,
        byte[] data
) {
}
