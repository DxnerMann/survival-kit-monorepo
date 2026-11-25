package com.survivalkit.backend.adapter.postgres.calendar;

public record VisibleCustomEvent(
        StoredCustomEvent event,
        String inviteStatus
) {
}
