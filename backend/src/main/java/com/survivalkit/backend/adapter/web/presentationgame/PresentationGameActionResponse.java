package com.survivalkit.backend.adapter.web.presentationgame;

import java.time.Instant;

public record PresentationGameActionResponse(
        String event,
        int pointsDelta,
        String userId,
        String username,
        int presenterPoints,
        String currentWord,
        int wordIndex,
        int totalWords,
        int currentApprovals,
        int approvalThreshold,
        Instant cooldownUntil
) {}
