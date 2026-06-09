package com.survivalkit.backend.adapter.postgres.feedback;

import java.time.Instant;

public record Feedback(
        String id,
        String title,
        String description,
        String authorUsername,
        String authorUserId,
        FeedbackType type,
        int likes,
        int dislikes,
        String answer,
        Instant addedAt,
        Instant lastUpdated

) {
    public enum FeedbackType {
        OTHER,
        IDEA,
        BUG,
        FEEDBACK
    }
}
