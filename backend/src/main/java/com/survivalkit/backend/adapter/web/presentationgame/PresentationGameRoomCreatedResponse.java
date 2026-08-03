package com.survivalkit.backend.adapter.web.presentationgame;

public record PresentationGameRoomCreatedResponse(
        String id,
        String name,
        String joinCode,
        boolean isPublic
) {}
