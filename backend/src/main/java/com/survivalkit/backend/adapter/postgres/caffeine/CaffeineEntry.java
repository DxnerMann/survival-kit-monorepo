package com.survivalkit.backend.adapter.postgres.caffeine;

import java.time.Instant;

public record CaffeineEntry(
        String id,
        String userId,
        String source,
        int amountMg,
        Instant consumedAt
) {
}
