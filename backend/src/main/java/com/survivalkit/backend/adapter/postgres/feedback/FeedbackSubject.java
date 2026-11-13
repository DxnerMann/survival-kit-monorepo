package com.survivalkit.backend.adapter.postgres.feedback;

public record FeedbackSubject(
        String authorUserId,
        String title
) {
}
