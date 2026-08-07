package com.survivalkit.backend.adapter.rapla.adapter;

import com.survivalkit.backend.adapter.rapla.RaplaMigration;
import com.survivalkit.backend.adapter.rapla.support.RaplaUrlSupport;
import com.survivalkit.backend.adapter.rapla.support.WeekTableLectureParser;
import com.survivalkit.backend.shared.Lecture;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
public class RaplaAdapterV2 implements RaplaAdapter {

    @Override
    public String id() {
        return RaplaAdapter.V2;
    }

    @Override
    public boolean supports(String url) {
        try {
            var uri = new URI(url);
            var host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
            var path = uri.getPath() != null ? uri.getPath().toLowerCase() : "";
            var query = uri.getQuery() != null ? uri.getQuery().toLowerCase() : "";

            if (host.endsWith(".dhbw-karlsruhe.de")) {
                return false;
            }

            if (path.contains("/calendar") && isCentralRaplaHost(host)) {
                return true;
            }

            return query.contains("salt=") && query.contains("key=") && isCentralRaplaHost(host);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String formatToBaseUrl(String url) {
        var params = RaplaUrlSupport.parseQueryParams(url);
        var key = params.get("key");
        var salt = params.get("salt");
        var user = params.get("user");
        var file = params.get("file");

        var query = new StringBuilder();

        if (key != null && salt != null) {
            query.append("salt=").append(salt);
            query.append("&key=").append(key);
        } else {
            if (user != null) {
                query.append("user=").append(RaplaUrlSupport.encodeQueryParam(user));
            }
            if (file != null) {
                if (!query.isEmpty()) {
                    query.append("&");
                }
                query.append("file=").append(RaplaUrlSupport.encodeQueryParam(file));
            }
        }

        if (query.isEmpty()) {
            return url;
        }

        return RaplaUrlSupport.rebuildUri(url, query.toString());
    }

    @Override
    public URI buildWeekRequestUri(String baseUrl, LocalDate monday) {
        return UriComponentsBuilder
                .fromUriString(formatToBaseUrl(baseUrl))
                .queryParam("day", monday.getDayOfMonth())
                .queryParam("month", monday.getMonthValue())
                .queryParam("year", monday.getYear())
                .build()
                .toUri();
    }

    @Override
    public String extractCourse(Document document, String baseUrl) {
        return RaplaUrlSupport.courseNameFromDocument(document);
    }

    @Override
    public List<Lecture> parseLectures(Document document) {
        return WeekTableLectureParser.parse(document);
    }

    @Override
    public int preferenceOrderAt(LocalDate date) {
        return date.isBefore(RaplaMigration.NEW_RAPLA_CUTOFF) ? 100 : 0;
    }

    @Override
    public Optional<String> deprecationNoticeWhenUsedAt(LocalDate date) {
        return Optional.empty();
    }

    private boolean isCentralRaplaHost(String host) {
        return host.equals("rapla.dhbw.de") || (host.startsWith("rapla.") && host.endsWith(".dhbw.de"));
    }
}
