package com.survivalkit.backend.adapter.postgres.course;

public record CourseRaplaConfig(
        String course,
        String url
) {
    public boolean hasUrl() {
        return url != null && !url.isBlank();
    }
}
