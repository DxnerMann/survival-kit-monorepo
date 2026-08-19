package com.survivalkit.backend.core.admin;

public record StorageCategory(
        String id,
        String label,
        long bytes,
        long items
) {
}
