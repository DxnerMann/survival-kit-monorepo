package com.survivalkit.backend.adapter.web.presentationgame;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoom;

public record CreatePresentationGameRoomRequest(
        String name,
        boolean isPublic,
        PresentationGameRoom.Difficulty difficulty
) {}
