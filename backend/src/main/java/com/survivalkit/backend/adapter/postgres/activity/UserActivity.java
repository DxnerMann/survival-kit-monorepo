package com.survivalkit.backend.adapter.postgres.activity;

import java.time.Instant;

public record UserActivity(
        String id,
        String userId,
        String kind,
        String title,
        String actorUsername,
        String subjectId,
        Instant createdAt
) {
}
