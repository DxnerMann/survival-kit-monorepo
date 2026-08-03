package com.survivalkit.backend.adapter.web.presentationgame;

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
        int approvalThreshold
) {}
