package com.survivalkit.backend.adapter.postgres.chat;

import java.util.List;

public record ChatReactionUpdate(
        String course,
        String messageId,
        List<ChatReaction> reactions
) {
}
