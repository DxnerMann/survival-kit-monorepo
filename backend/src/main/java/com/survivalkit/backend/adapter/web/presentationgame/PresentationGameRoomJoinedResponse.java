package com.survivalkit.backend.adapter.web.presentationgame;

public record PresentationGameRoomJoinedResponse(
        String id,
        String name,
        String joinCode
) {}
