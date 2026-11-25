package com.survivalkit.backend.core.calendar;

import java.util.List;

public record CreateCustomEventCommand(
        String title,
        String date,
        String startTime,
        String endTime,
        String room,
        String description,
        List<String> inviteUsernames
) {
}
