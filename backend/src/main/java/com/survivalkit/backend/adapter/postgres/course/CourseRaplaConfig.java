package com.survivalkit.backend.adapter.postgres.course;

import java.util.Map;

public record CourseRaplaConfig(
        String course,
        Map<String, String> urlsByVersion
) {
    public boolean hasAnyUrl() {
        return !urlsByVersion.isEmpty();
    }
}
