package com.survivalkit.backend.adapter.web.presentationgame;

public record PresentationGameRoomMemberResponse(
        String userId,
        String username,
        boolean host
) {}
