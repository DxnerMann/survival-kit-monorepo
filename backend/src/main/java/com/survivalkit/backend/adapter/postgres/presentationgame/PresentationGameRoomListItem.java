package com.survivalkit.backend.adapter.postgres.presentationgame;

public record PresentationGameRoomListItem(
        String id,
        String name,
        String hostUsername,
        PresentationGameRoom.Difficulty difficulty,
        int jurySize
) {}
