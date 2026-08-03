package com.survivalkit.backend.adapter.web.presentationgame;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoom;

import java.util.List;

public record PresentationGameRoomDetailResponse(
        String id,
        String name,
        String joinCode,
        String hostUserId,
        String hostUsername,
        PresentationGameRoom.Difficulty difficulty,
        PresentationGameRoom.Status status,
        boolean isPublic,
        boolean isHost,
        boolean canJoin,
        List<PresentationGameRoomMemberResponse> members
) {}
