package com.survivalkit.backend.shared;

public record VoteUpdate(
        Boolean upVote,
        int likes,
        int dislikes,
        boolean awardXp,
        boolean notifyLike
) {
}
