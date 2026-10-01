package com.survivalkit.backend.adapter.postgres.guest;

import java.time.Instant;

public record Guest(
        String id,
        Instant firstSeen,
        Instant lastSeen
) {
}
