package com.survivalkit.backend.adapter.postgres.calendar;

public record CustomEventInvite(
        String id,
        String eventId,
        String inviteeUserId,
        String status,
        String activityId
) {
}
