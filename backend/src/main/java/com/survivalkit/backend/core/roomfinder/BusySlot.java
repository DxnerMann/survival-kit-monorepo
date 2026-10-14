package com.survivalkit.backend.core.roomfinder;

import java.util.List;

public record BusySlot(long start, long end, String summary, List<String> courses) {
    public BusySlot {
        courses = courses == null ? List.of() : List.copyOf(courses);
        summary = summary == null ? "" : summary;
    }

    public BusySlot(long start, long end) {
        this(start, end, "", List.of());
    }
}

