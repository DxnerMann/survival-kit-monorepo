package com.survivalkit.backend.core.draw;

import java.util.List;

public record DrawStroke(
        String id,
        String authorId,
        String tool,
        String color,
        double width,
        List<List<Double>> points
) {
}
