package com.survivalkit.backend.core.admin;

import java.util.List;

public record StorageUsage(
        long databaseBytes,
        long capacityBytes,
        List<StorageCategory> categories
) {
}
