package com.survivalkit.backend.adapter.postgres.calendar;

public record StoredCustomEvent(
        String id,
        String ownerUserId,
        String title,
        String eventDate,
        String startTime,
        String endTime,
        String room,
        String description
) {
}
