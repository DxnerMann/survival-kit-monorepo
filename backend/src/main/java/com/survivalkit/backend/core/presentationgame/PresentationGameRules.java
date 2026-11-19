package com.survivalkit.backend.core.presentationgame;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoom;

import java.time.Duration;

public final class PresentationGameRules {

    public static final int WORD_PREFETCH_BATCH = 50;
    public static final int WORD_PREFETCH_REMAINING = 5;
    public static final Duration WORD_COOLDOWN = Duration.ofSeconds(2);
    public static final int DEFAULT_APPROVAL_PERCENT = 50;

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

    public static int approvalThreshold(int jurySize, int approvalPercent) {
        if (jurySize <= 0) {
            return 1;
        }
        var percent = Math.min(100, Math.max(1, approvalPercent));
        return Math.max(1, (int) Math.ceil(jurySize * (percent / 100.0)));
    }

    public static int jurySize(int memberCount) {
        return Math.max(0, memberCount - 1);
    }
}
