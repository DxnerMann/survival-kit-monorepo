package com.survivalkit.backend.adapter.websocket;

public record WebSocketUserContext(
        String userId,
        String username,
        String course
) {}
