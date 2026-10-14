package com.survivalkit.backend.adapter.postgres.caffeine;

public record CaffeinePreset(
        String id,
        String name,
        int amountMg
) {
}
