package com.survivalkit.backend.adapter.postgres.presentationgame;

public record PresentationGameRoomMember(
        String userId,
        String username,
        boolean host
) {}
