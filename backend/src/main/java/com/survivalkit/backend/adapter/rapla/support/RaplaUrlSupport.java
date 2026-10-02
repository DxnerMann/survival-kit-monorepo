package com.survivalkit.backend.adapter.rapla.support;

import com.survivalkit.backend.adapter.web.ErrorCode;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public final class RaplaUrlSupport {

    private static final Pattern COURSE_CODE = Pattern.compile("[A-Za-z]{2,}\\d+[A-Za-z]\\d+");

    private static final Set<String> ALLOWED_RAPLA_HOSTS = Set.of(
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
            var query = uri.getRawQuery();
            if (query == null) {
                return Map.of();
            }

            var params = new LinkedHashMap<String, String>();
            for (String param : query.split("&")) {
                var keyValue = param.split("=", 2);
                if (keyValue.length == 2) {
                    params.put(
                            URLDecoder.decode(keyValue[0], StandardCharsets.UTF_8),
                            URLDecoder.decode(keyValue[1], StandardCharsets.UTF_8)
                    );
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
            var base = uri.getScheme() + "://" + uri.getAuthority() + canonicalPath(uri.getRawPath());
            if (query == null || query.isBlank()) {
                return base;
            }
            return base + "?" + query;
        } catch (URISyntaxException e) {
            return raplaUrl;
        }
    }

    static String canonicalPath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            return "";
        }
        var path = rawPath.replaceAll("(?i)/internal_calendar", "/calendar");
        if (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        if (!path.toLowerCase().contains("/calendar")) {
            if (path.isBlank() || "/".equals(path) || path.toLowerCase().endsWith("/rapla")) {
                path = path.toLowerCase().endsWith("/rapla") ? path + "/calendar" : "/rapla/calendar";
            }
        }
        return path;
    }

    public static String encodeQueryParam(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public static String courseNameFromDocument(org.jsoup.nodes.Document document) {
        String heading = null;
        var h2 = document.selectFirst("h2.title");
        if (h2 != null) {
            var text = h2.text().trim();
            if (!text.isBlank()) {
                heading = text;
            }
        }

        var title = document.title().trim();
        var fromHeading = courseCode(heading);
        if (fromHeading != null) {
            return fromHeading;
        }
        var fromTitle = courseCode(title);
        if (fromTitle != null) {
            return fromTitle;
        }
        if (heading != null) {
            return heading;
        }
        return title.isBlank() ? null : title;
    }

    public static String courseCode(String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        var matcher = COURSE_CODE.matcher(name);
        if (!matcher.find()) {
            return null;
        }
        return matcher.group().toUpperCase(Locale.ROOT);
    }
}
