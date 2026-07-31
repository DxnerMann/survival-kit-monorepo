package com.survivalkit.backend.adapter.web.caffeine;

import java.time.Instant;

public record CaffeineAddRequest(
        String source,
        Integer amountMg,
        Instant consumedAt
) {
}
