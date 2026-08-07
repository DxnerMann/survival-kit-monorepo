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
public class RaplaAdapterV1 implements RaplaAdapter {

    @Override
    public String id() {
        return RaplaAdapter.V1;
    }

    @Override
    public boolean supports(String url) {
        try {
            var host = new URI(url).getHost();
            return host != null && host.toLowerCase().endsWith(".dhbw-karlsruhe.de");
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String formatToBaseUrl(String url) {
        var params = RaplaUrlSupport.parseQueryParams(url);
        var user = params.get("user");
        var file = params.get("file");

        if (user == null && file == null) {
            return url;
        }

        var query = new StringBuilder("page=calendar");
        if (user != null) {
            query.append("&user=").append(user);
        }
        if (file != null) {
            query.append("&file=").append(file);
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
        var courseName = RaplaUrlSupport.courseNameFromDocument(document);
        if (courseName != null) {
            return courseName;
        }

        var fileParam = RaplaUrlSupport.extractQueryParam(baseUrl, "file");
        if (fileParam != null && !fileParam.isBlank()) {
            return fileParam;
        }

        return null;
    }

    @Override
    public List<Lecture> parseLectures(Document document) {
        return WeekTableLectureParser.parse(document);
    }

    @Override
    public int preferenceOrderAt(LocalDate date) {
        return date.isBefore(RaplaMigration.NEW_RAPLA_CUTOFF) ? 0 : 100;
    }

    @Override
    public Optional<String> deprecationNoticeWhenUsedAt(LocalDate date) {
        if (!date.isBefore(RaplaMigration.NEW_RAPLA_CUTOFF)) {
            return Optional.of(RaplaMigration.LEGACY_IN_USE_NOTICE);
        }
        return Optional.empty();
    }
}
