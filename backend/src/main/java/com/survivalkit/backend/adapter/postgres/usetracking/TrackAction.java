package com.survivalkit.backend.adapter.postgres.usetracking;

public record TrackAction(
        String id,
        Action type,
        String userIdIfUser,
        String courseIfUser,
        float value
) {
    public enum Action {
        EXMATRICULATED,
        GAME_PLAYED,
        GAME_SUGGESTED,
        IDEA_SUBMITTED,
        SURVIVAL_KIT_OPENED
    }
}
