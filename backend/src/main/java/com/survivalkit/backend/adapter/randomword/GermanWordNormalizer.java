package com.survivalkit.backend.adapter.randomword;

import org.springframework.web.util.HtmlUtils;

import java.util.regex.Pattern;

final class GermanWordNormalizer {

    private static final Pattern VALID_WORD = Pattern.compile("^[a-zA-ZäöüÄÖÜß]{3,32}$");

    private GermanWordNormalizer() {}

    static String normalize(String rawWord) {
        if (rawWord == null || rawWord.isBlank()) {
            return null;
        }

        var trimmed = HtmlUtils.htmlUnescape(rawWord.trim());
        if (trimmed.contains(" ") || trimmed.contains("-")) {
            return null;
        }

        if (!VALID_WORD.matcher(trimmed).matches()) {
            return null;
        }

        return trimmed;
    }
}
