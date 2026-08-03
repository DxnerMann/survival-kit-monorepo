package com.survivalkit.backend.core.presentationgame;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoom;

public final class PresentationGameRules {

    public static final int WORD_PREFETCH_BATCH = 50;
    public static final int WORD_PREFETCH_REMAINING = 5;
    private static final double APPROVAL_RATIO = 0.1;

    private PresentationGameRules() {}

    public static int approvePoints(PresentationGameRoom.Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> 1;
            case MEDIUM -> 2;
            case HARD -> 3;
        };
    }

    public static int skipPenalty(PresentationGameRoom.Difficulty difficulty) {
        return difficulty == PresentationGameRoom.Difficulty.MEDIUM ? -1 : 0;
    }

    public static boolean canSkip(PresentationGameRoom.Difficulty difficulty) {
        return difficulty != PresentationGameRoom.Difficulty.HARD;
    }

    public static int approvalThreshold(int jurySize) {
        if (jurySize <= 0) {
            return 1;
        }
        return Math.max(1, (int) Math.ceil(jurySize * APPROVAL_RATIO));
    }

    public static int jurySize(int memberCount) {
        return Math.max(0, memberCount - 1);
    }
}
