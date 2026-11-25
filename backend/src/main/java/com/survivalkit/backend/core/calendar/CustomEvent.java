package com.survivalkit.backend.core.calendar;

public record CustomEvent(
        String id,
        String title,
        String date,
        String startTime,
        String endTime,
        String room,
        String description,
        boolean owned
) {
}
