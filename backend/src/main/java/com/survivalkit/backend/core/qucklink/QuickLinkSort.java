package com.survivalkit.backend.core.qucklink;

import com.survivalkit.backend.adapter.postgres.quicklink.QuickLink;

import java.time.Instant;
import java.util.Comparator;
import java.util.Locale;

public enum QuickLinkSort {
    POPULAR,
    LEAST_POPULAR,
    NEWEST,
    OLDEST,
    ID;

    private static final String SEPARATOR = "\u001f";

    public static QuickLinkSort fromRequest(String sort, boolean sortByPopularity) {
        if (sort != null && !sort.isBlank()) {
            try {
                var parsed = QuickLinkSort.valueOf(sort.trim().toUpperCase(Locale.ROOT));
                return parsed == ID ? (sortByPopularity ? POPULAR : ID) : parsed;
            } catch (IllegalArgumentException ex) {
                return sortByPopularity ? POPULAR : ID;
            }
        }
        return sortByPopularity ? POPULAR : ID;
    }

    public Comparator<QuickLink> comparator() {
        return switch (this) {
            case POPULAR -> Comparator.comparingInt(QuickLink::clickedThisMonth).reversed()
                    .thenComparing(QuickLink::id);
            case LEAST_POPULAR -> Comparator.comparingInt(QuickLink::clickedThisMonth)
                    .thenComparing(QuickLink::id);
            case NEWEST -> Comparator
                    .comparing((QuickLink link) -> addedAt(link)).reversed()
                    .thenComparing(Comparator.comparing(QuickLink::id).reversed());
            case OLDEST -> Comparator.comparing(QuickLinkSort::addedAt)
                    .thenComparing(QuickLink::id);
            case ID -> Comparator.comparing(QuickLink::id);
        };
    }

    public String encode(QuickLink link) {
        return switch (this) {
            case POPULAR, LEAST_POPULAR -> name() + SEPARATOR + link.clickedThisMonth() + SEPARATOR + link.id();
            case NEWEST, OLDEST -> name() + SEPARATOR + addedAt(link) + SEPARATOR + link.id();
            case ID -> link.id();
        };
    }

    public Cursor decode(String continuation) {
        if (continuation == null || continuation.isBlank()) {
            return Cursor.none();
        }
        if (this == ID && !continuation.contains(SEPARATOR)) {
            return new Cursor(null, null, continuation);
        }
        var parts = continuation.split(SEPARATOR, -1);
        if (parts.length == 2 && (this == POPULAR || this == LEAST_POPULAR)) {
            return clicksCursor(parts[0], parts[1]);
        }
        if (parts.length < 3 || !name().equals(parts[0]) || parts[2].isBlank()) {
            return Cursor.none();
        }
        return switch (this) {
            case POPULAR, LEAST_POPULAR -> clicksCursor(parts[1], parts[2]);
            case NEWEST, OLDEST -> {
                try {
                    yield new Cursor(null, Instant.parse(parts[1]), parts[2]);
                } catch (RuntimeException ex) {
                    yield Cursor.none();
                }
            }
            case ID -> new Cursor(null, null, parts[2]);
        };
    }

    public boolean isAfter(QuickLink link, Cursor cursor) {
        if (cursor.id() == null) {
            return true;
        }
        return switch (this) {
            case POPULAR -> compareClicks(link, cursor) < 0
                    || (compareClicks(link, cursor) == 0 && link.id().compareTo(cursor.id()) > 0);
            case LEAST_POPULAR -> compareClicks(link, cursor) > 0
                    || (compareClicks(link, cursor) == 0 && link.id().compareTo(cursor.id()) > 0);
            case NEWEST -> {
                int compared = addedAt(link).compareTo(cursor.addedAt() == null ? Instant.EPOCH : cursor.addedAt());
                yield compared < 0 || (compared == 0 && link.id().compareTo(cursor.id()) < 0);
            }
            case OLDEST -> {
                int compared = addedAt(link).compareTo(cursor.addedAt() == null ? Instant.EPOCH : cursor.addedAt());
                yield compared > 0 || (compared == 0 && link.id().compareTo(cursor.id()) > 0);
            }
            case ID -> link.id().compareTo(cursor.id()) > 0;
        };
    }

    private static Cursor clicksCursor(String clicks, String id) {
        try {
            return new Cursor(Integer.valueOf(clicks), null, id);
        } catch (NumberFormatException ex) {
            return Cursor.none();
        }
    }

    private static int compareClicks(QuickLink link, Cursor cursor) {
        int cursorClicks = cursor.clicks() == null ? 0 : cursor.clicks();
        return Integer.compare(link.clickedThisMonth(), cursorClicks);
    }

    private static Instant addedAt(QuickLink link) {
        return link.addedAt() == null ? Instant.EPOCH : link.addedAt();
    }

    public record Cursor(Integer clicks, Instant addedAt, String id) {
        public static Cursor none() {
            return new Cursor(null, null, null);
        }
    }
}
