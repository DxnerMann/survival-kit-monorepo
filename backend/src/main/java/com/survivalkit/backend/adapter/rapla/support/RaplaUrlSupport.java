package com.survivalkit.backend.adapter.rapla.support;

import com.survivalkit.backend.adapter.web.ErrorCode;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

public final class RaplaUrlSupport {

    private static final Set<String> ALLOWED_RAPLA_HOSTS = Set.of(
            "rapla.dhbw-karlsruhe.de",
            "rapla.dhbw.de"
    );

    private RaplaUrlSupport() {}

    public static void assertAllowedHost(String raplaUrl) {
        if (raplaUrl == null || raplaUrl.isBlank()) {
            throw new IllegalArgumentException(ErrorCode.RAPLA_URL_NOT_ALLOWED.getCode());
        }

        try {
            var uri = new URI(raplaUrl);
            var scheme = uri.getScheme();
            var host = uri.getHost();

            if (scheme == null || host == null || !"https".equalsIgnoreCase(scheme)) {
                throw new IllegalArgumentException(ErrorCode.RAPLA_URL_NOT_ALLOWED.getCode());
            }

            var normalizedHost = host.toLowerCase();
            var allowed = ALLOWED_RAPLA_HOSTS.contains(normalizedHost)
                    || (normalizedHost.startsWith("rapla.") && normalizedHost.endsWith(".dhbw.de"));

            if (!allowed) {
                throw new IllegalArgumentException(ErrorCode.RAPLA_URL_NOT_ALLOWED.getCode());
            }
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException(ErrorCode.RAPLA_URL_NOT_ALLOWED.getCode());
        }
    }

    public static Map<String, String> parseQueryParams(String raplaUrl) {
        try {
            var uri = new URI(raplaUrl);
            var query = uri.getQuery();
            if (query == null) {
                return Map.of();
            }

            var params = new LinkedHashMap<String, String>();
            for (String param : query.split("&")) {
                var keyValue = param.split("=", 2);
                if (keyValue.length == 2) {
                    params.put(keyValue[0], keyValue[1]);
                }
            }
            return params;
        } catch (URISyntaxException e) {
            return Map.of();
        }
    }

    public static String extractQueryParam(String raplaUrl, String paramName) {
        var value = parseQueryParams(raplaUrl).get(paramName);
        if (value == null) {
            return null;
        }
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    public static String rebuildUri(String raplaUrl, String query) {
        try {
            var uri = new URI(raplaUrl);
            return new URI(
                    uri.getScheme(),
                    uri.getAuthority(),
                    uri.getPath(),
                    query,
                    null
            ).toString();
        } catch (URISyntaxException e) {
            return raplaUrl;
        }
    }

    public static String courseNameFromDocument(org.jsoup.nodes.Document document) {
        var h2 = document.selectFirst("h2.title");
        if (h2 != null) {
            var text = h2.text().trim();
            if (!text.isBlank()) {
                return text;
            }
        }

        var title = document.title().trim();
        if (!title.isBlank()) {
            return title;
        }

        return null;
    }
}
