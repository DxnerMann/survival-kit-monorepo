package com.survivalkit.backend.core.websocket;

public record WebSocketUserContextView(
        String userId,
        String username,
        String course
) {}
