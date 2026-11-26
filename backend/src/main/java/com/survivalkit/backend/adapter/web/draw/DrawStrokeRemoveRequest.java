package com.survivalkit.backend.adapter.web.draw;

public record DrawStrokeRemoveRequest(
        String partnerUsername,
        String strokeId
) {
}
