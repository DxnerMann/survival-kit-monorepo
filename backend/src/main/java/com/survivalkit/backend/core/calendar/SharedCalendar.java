package com.survivalkit.backend.core.calendar;

import java.util.List;

public record SharedCalendar(
        List<CustomEvent> events,
        SharedCalendarColors colors,
        String accent,
        List<String> hiddenLectures
) {
}
