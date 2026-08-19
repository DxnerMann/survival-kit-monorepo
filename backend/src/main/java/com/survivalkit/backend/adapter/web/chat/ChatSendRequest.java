package com.survivalkit.backend.adapter.web.chat;

import java.util.List;

public record ChatSendRequest(
        String text,
        List<String> attachmentIds,
        String clientId
) {
}
