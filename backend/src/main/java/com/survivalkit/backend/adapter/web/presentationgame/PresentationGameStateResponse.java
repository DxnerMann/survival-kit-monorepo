package com.survivalkit.backend.adapter.web.presentationgame;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoom;

import java.util.List;

public record PresentationGameStateResponse(
        String currentWord,
        int wordIndex,
        int totalWords,
        int presenterPoints,
        int jurySize,
        int approvalThreshold,
        int currentApprovals,
        List<String> approvingUserIds,
        PresentationGameRoom.Difficulty difficulty,
        PresentationGameRoom.Status status,
        boolean isHost,
        boolean isJury,
        boolean canSkip,
        boolean canApprove,
        boolean hasVotedCurrentWord,
        List<PresentationGameRoomMemberResponse> members
) {}
