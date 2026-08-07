package com.survivalkit.backend.adapter.rapla;

import com.survivalkit.backend.adapter.rapla.adapter.RaplaAdapter;
import com.survivalkit.backend.adapter.rapla.support.RaplaUrlSupport;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.shared.Lecture;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class RaplaApiClient implements RaplaApiPort {

    private static final int MAX_SEMESTER_WEEKS = 30;
    private static final ZoneId ZONE = ZoneId.of("Europe/Berlin");

    private final RestClient restClient;
    private final RaplaAdapterRegistry adapterRegistry;

    public RaplaApiClient(RestClient restClient, RaplaAdapterRegistry adapterRegistry) {
        this.restClient = restClient;
        this.adapterRegistry = adapterRegistry;
    }

    @Override
    public List<Lecture> getLectures(int weekOffset, String raplaCourseBaseUrl) {
        var adapter = resolveAdapter(raplaCourseBaseUrl);
        var baseUrl = adapter.formatToBaseUrl(raplaCourseBaseUrl);
        var html = fetchWeekHtml(adapter, baseUrl, weekOffset);
        return adapter.parseLectures(Jsoup.parse(html));
    }

    @Override
    public String extractCourse(String raplaCourseBaseUrl) {
        var adapter = resolveAdapter(raplaCourseBaseUrl);
        var baseUrl = adapter.formatToBaseUrl(raplaCourseBaseUrl);
        var html = fetchWeekHtml(adapter, baseUrl, 0);
        var course = adapter.extractCourse(Jsoup.parse(html), baseUrl);

        if (course == null || course.isBlank()) {
            throw new CourseExtractionFailedException(ErrorCode.COURSE_EXTRACTION_FAILED.getCode());
        }

        return course;
    }

    @Override
    public List<String> getLectureNamesForSemester(String raplaCourseBaseUrl) {
        var lectureNames = new HashSet<String>();

        collectLectures(0, -1, raplaCourseBaseUrl, lectureNames);
        collectLectures(1, 1, raplaCourseBaseUrl, lectureNames);

        return lectureNames.stream()
                .sorted()
                .toList();
    }

    @Override
    public String formatToBaseUrl(String raplaUrl) {
        return resolveAdapter(raplaUrl).formatToBaseUrl(raplaUrl);
    }

    private void collectLectures(
            int startOffset,
            int direction,
            String raplaCourseBaseUrl,
            Set<String> lectureNames
    ) {
        var weekOffset = startOffset;
        var weeksFetched = 0;

        while (weeksFetched < MAX_SEMESTER_WEEKS) {
            var week = getLectures(weekOffset, raplaCourseBaseUrl);

            if (week.isEmpty()) {
                break;
            }

            week.forEach(lecture -> lectureNames.add(lecture.title().replaceAll("\\s*\\([^)]*\\)", "")));
            weekOffset += direction;
            weeksFetched++;
        }
    }

    private RaplaAdapter resolveAdapter(String raplaUrl) {
        RaplaUrlSupport.assertAllowedHost(raplaUrl);
        try {
            return adapterRegistry.resolveForUrl(raplaUrl);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(ErrorCode.RAPLA_URL_NOT_ALLOWED.getCode(), ex);
        }
    }

    private String fetchWeekHtml(RaplaAdapter adapter, String baseUrl, int weekOffset) {
        var monday = LocalDate.now(ZONE)
                .with(DayOfWeek.MONDAY)
                .plusWeeks(weekOffset);

        try {
            return restClient.get()
                    .uri(adapter.buildWeekRequestUri(baseUrl, monday))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException e) {
            throw new RuntimeException(ErrorCode.RAPLA_REQUEST_FAILED.getCode(), e);
        }
    }
}
