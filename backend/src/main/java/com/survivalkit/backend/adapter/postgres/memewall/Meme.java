package com.survivalkit.backend.adapter.postgres.memewall;

import java.time.Instant;

public record Meme(
        String id,
        String title,
        String description,
        byte[] img,
        String contentType,
        String course,
        String authorUserId,
        Instant addedAt,
        Instant lastUpdated
) {
}
