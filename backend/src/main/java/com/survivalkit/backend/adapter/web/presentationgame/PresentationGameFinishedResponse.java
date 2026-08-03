package com.survivalkit.backend.adapter.web.presentationgame;

import java.time.Instant;

public record PresentationGameFinishedResponse(
        String id,
        String name,
        String hostUsername,
        int presenterPoints,
        Instant finishedAt
) {}
