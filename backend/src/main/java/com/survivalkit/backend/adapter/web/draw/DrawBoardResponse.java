package com.survivalkit.backend.adapter.web.draw;

import java.util.List;

public record DrawBoardResponse(
        String status,
        String partnerUsername,
        String channel,
        List<Stroke> strokes,
        boolean selfWantsReset,
        boolean partnerWantsReset
) {
    public record Stroke(
            String id,
            String tool,
            String color,
            double width,
            List<List<Double>> points
    ) {
    }

    public static DrawBoardResponse idle() {
        return new DrawBoardResponse("idle", "", null, List.of(), false, false);
    }
}
