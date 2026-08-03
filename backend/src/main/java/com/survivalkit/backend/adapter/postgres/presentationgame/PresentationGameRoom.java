package com.survivalkit.backend.adapter.postgres.presentationgame;

import java.time.Instant;

public record PresentationGameRoom(
        String id,
        String name,
        String hostUserId,
        String hostUsername,
        String course,
        boolean isPublic,
        String joinCode,
        Difficulty difficulty,
        Status status,
        Instant createdAt,
        Instant startedAt,
        Instant finishedAt,
        int presenterPoints,
        int currentWordIndex
) {
    public enum Difficulty {
        EASY,
        MEDIUM,
        HARD
    }

    public enum Status {
        LOBBY,
        IN_PROGRESS,
        FINISHED
    }
}
