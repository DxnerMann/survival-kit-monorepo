package com.survivalkit.backend.adapter.web.quicklink;

public record QuickLinkSuggestionRequest(
        String title,
        String description,
        String url
) {
}
