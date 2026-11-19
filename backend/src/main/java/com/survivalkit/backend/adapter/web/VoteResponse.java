package com.survivalkit.backend.adapter.web;

import com.survivalkit.backend.shared.VoteUpdate;

public record VoteResponse(
        Boolean upVote,
        int likes,
        int dislikes
) {
    public static VoteResponse from(VoteUpdate update) {
        return new VoteResponse(update.upVote(), update.likes(), update.dislikes());
    }
}
