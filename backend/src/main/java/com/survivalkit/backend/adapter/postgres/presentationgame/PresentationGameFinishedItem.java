package com.survivalkit.backend.adapter.postgres.presentationgame;

import java.time.Instant;

public record PresentationGameFinishedItem(
        String id,
        String name,
        String hostUsername,
        int presenterPoints,
        Instant finishedAt
) {}
