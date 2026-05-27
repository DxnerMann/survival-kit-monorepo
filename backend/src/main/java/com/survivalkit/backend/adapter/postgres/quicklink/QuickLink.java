package com.survivalkit.backend.adapter.postgres.quicklink;

import java.time.Instant;

public record QuickLink(
        String id,
        String title,
        String description,
        String url,
        int clickedThisMonth,
        int clickedOverall,
        int favouriteCount,
        Boolean approvedByAdmin,
        Instant addedAt,
        Instant lastUpdated,
        Instant lastReset
) {
}
