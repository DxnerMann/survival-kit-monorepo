package com.survivalkit.backend.adapter.web.quicklink;

public record QuickLinkApprovementRequest(
        String linkId,
        Boolean approved,
        String improvedDescription,
        String improvedTitle
) {
}
