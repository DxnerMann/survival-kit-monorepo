package com.survivalkit.backend.adapter.web.feedback;

import com.survivalkit.backend.adapter.postgres.feedback.Feedback;

public record FeedbackSubmissionRequest(
        String title,
        String description,
        Feedback.FeedbackType type
) {
}
