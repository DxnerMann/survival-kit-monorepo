package com.survivalkit.backend.adapter.postgres.usetracking;

import java.time.Instant;

public record TrackAction(
        String id,
        Action type,
        String userIdIfUser,
        String courseIfUser,
        Instant timestamp
) {
    public enum Action {
        EXMATRICULATED, // triggered through Controller
        GAME_PLAYED,
        GAME_SUGGESTED,
        IDEA_SUBMITTED,
        LOGGED_IN
    }
}
