package com.survivalkit.backend.core.admin;

public record AdminHealth(
        String status,
        String database,
        String redis
) {
}
