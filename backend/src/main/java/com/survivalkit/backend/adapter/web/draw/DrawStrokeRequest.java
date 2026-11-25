package com.survivalkit.backend.adapter.web.draw;

public record DrawStrokeRequest(
        String partnerUsername,
        DrawBoardResponse.Stroke stroke
) {
}
