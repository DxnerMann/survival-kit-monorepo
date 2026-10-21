package com.survivalkit.backend.adapter.postgres.memewall;

public record MemeOwner(
        String id,
        String title,
        String authorUserId,
        String course
) {
}
