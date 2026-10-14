package com.survivalkit.backend.adapter.postgres.chat;

public record ChatReaction(
        String emoji,
        String userId,
        String username
) {
}
