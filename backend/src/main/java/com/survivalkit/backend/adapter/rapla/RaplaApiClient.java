package com.survivalkit.backend.adapter.rapla;

import com.survivalkit.backend.shared.Lecture;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import org.jsoup.nodes.Element;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.stream.Collectors;

@Service
public class RaplaApiClient implements RaplaApiPort {

    private final RestClient restClient;

    public RaplaApiClient(RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public List<Lecture> getLectures(int weekOffset, String raplaCourseBaseUrl) {

        var document = Jsoup.parse(fetchRaplaPageWeek(weekOffset, raplaCourseBaseUrl));
        var lectures = new ArrayList<Lecture>();

        var rows = document.select("table.week_table tbody tr");

        for (var row : rows) {
            var cells = row.children();
            var dayCount = 0;

            for (var cell : cells) {
                if (cell.hasClass("week_smallseparatorcell_black")) {
                    dayCount++;
                    continue;
                }

                if (!cell.hasClass("week_block")) {
                    continue;
                }

                var lecture = parseWeekBlock(cell, dayCount);
                if (lecture != null) {
                    lectures.add(lecture);
                }
            }
        }

        return lectures;
    }

    @Override
    public String extractCourse(String raplaCourseBaseUrl) {
        if (raplaCourseBaseUrl != null && raplaCourseBaseUrl.contains("file=")) {
            try {
                var uri = new URI(raplaCourseBaseUrl);
                var query = uri.getQuery();
                if (query != null) {
                    for (String param : query.split("&")) {
                        if (param.startsWith("file=")) {
                            var value = param.substring("file=".length());
                            var decoded = URLDecoder.decode(value, StandardCharsets.UTF_8);
                            if (!decoded.isBlank()) {
                                return decoded;
                            }
                        }
                    }
                }
            } catch (URISyntaxException | IllegalArgumentException ignored) {
                // fall through to HTML fallback
            }
        }

        try {
            var document = Jsoup.parse(fetchRaplaPageWeek(0, raplaCourseBaseUrl));

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
        } catch (Exception ignored) {

        }

        throw new CourseExtractionFailedException("Could not extract Course from the provided Rapla Url.");
    }

    @Override
    public String formatToBaseUrl(String raplaUrl) {
        if (raplaUrl == null || raplaUrl.isEmpty()) {
            return raplaUrl;
        }

        try {
            var uri = new URI(raplaUrl);
            String query = uri.getQuery();

            if (query == null) {
                return raplaUrl;
            }

            var params = new LinkedHashMap<>();
            for (String param : query.split("&")) {
                var keyValue = param.split("=", 2);
                if (keyValue.length == 2) {
                    params.put(keyValue[0], keyValue[1]);
                }
            }

            var page = "calendar";
            var user = params.get("user");
            var file = params.get("file");

            var newQuery = new StringBuilder();
            newQuery.append("page=").append(page);
            if (user != null) newQuery.append("&user=").append(user);
            if (file != null) newQuery.append("&file=").append(file);

            var newUri = new URI(
                    uri.getScheme(),
                    uri.getAuthority(),
                    uri.getPath(),
                    newQuery.toString(),
                    null
            );

            return newUri.toString();

        } catch (URISyntaxException e) {
            return raplaUrl;
        }
    }

    private String fetchRaplaPageWeek(int weekOffset, String raplaCourseBaseUrl) {
        var monday = LocalDate.now(ZoneId.of("Europe/Berlin"))
                .with(DayOfWeek.MONDAY)
                .plusWeeks(weekOffset);

        var uri = UriComponentsBuilder
                .fromUriString(raplaCourseBaseUrl)
                .queryParam("day",   monday.getDayOfMonth())
                .queryParam("month", monday.getMonthValue())
                .queryParam("year",  monday.getYear())
                .toUriString();

        return restClient.get()
                .uri(uri)
                .retrieve()
                .body(String.class);
    }

    private Lecture parseWeekBlock(Element cell, int dayCount) {
        var anchor = cell.selectFirst("a");
        if (anchor == null) return null;

        var type = Lecture.LectureType.OTHER;
        var strongEl = cell.selectFirst("span.tooltip strong");
        if (strongEl != null) {
            type = switch (strongEl.text().trim()) {
                case "Lehrveranstaltung" -> Lecture.LectureType.LECTURE;
                case "Prüfung"          -> Lecture.LectureType.EXAM;
                default                 -> Lecture.LectureType.OTHER;
            };
        } else {
            var style = cell.attr("style");
            var colorMatch = style.contains("background-color:");
            if (colorMatch) {
                var color = style.replaceAll(".*background-color:\\s*", "").replaceAll(";.*", "").trim();
                type = switch (color.toUpperCase()) {
                    case "#EEEEEE" -> Lecture.LectureType.LECTURE;
                    case "#FF0000" -> Lecture.LectureType.EXAM;
                    default        -> Lecture.LectureType.OTHER;
                };
            }
        }

        var title = "";
        var startTime = "";
        var endTime = "";

        var textNodes = anchor.textNodes();
        if (!textNodes.isEmpty()) {
            var timeLine = textNodes.get(0).text().trim()
                    .replace("\u00a0", "") // remove &nbsp;
                    .replace(" ", "");

            var timeParts = timeLine.split("-");
            if (timeParts.length == 2) {
                startTime = timeParts[0].trim();
                endTime   = timeParts[1].trim();
            }
        }
        if (textNodes.size() > 1) {
            title = textNodes.get(1).text().trim();
        }

        if (title.isEmpty()) {
            for (var row : cell.select("table.infotable tr")) {
                if (row.selectFirst(".label") != null &&
                        row.selectFirst(".label").text().contains("Titel")) {
                    title = row.selectFirst(".value").text().trim();
                    break;
                }
            }
        }

        var personSpans = cell.select("span.person");
        var lecturer = personSpans.stream()
                .map(Element::text)
                .collect(Collectors.joining(", "));

        var resourceSpans = cell.select("span.resource");
        var rooms   = new ArrayList<String>();
        var courses = new ArrayList<String>();

        for (var span : resourceSpans) {
            var value = span.text().trim();
            if (isRoom(value)) {
                rooms.add(value);
            } else {
                courses.add(value);
            }
        }

        var day = DayOfWeek.MONDAY; // default
        var dateDivs = cell.select("span.tooltip div");
        if (dateDivs.size() >= 2) {
            var dateText = dateDivs.get(1).text().trim(); // e.g. "Fr 15.05.26 09:00-12:30"
            day = switch (dateText.substring(0, 2)) {
                case "Mo" -> DayOfWeek.MONDAY;
                case "Di" -> DayOfWeek.TUESDAY;
                case "Mi" -> DayOfWeek.WEDNESDAY;
                case "Do" -> DayOfWeek.THURSDAY;
                case "Fr" -> DayOfWeek.FRIDAY;
                case "Sa" -> DayOfWeek.SATURDAY;
                case "So" -> DayOfWeek.SUNDAY;
                default   -> DayOfWeek.MONDAY;
            };
        }

        return new Lecture(title, type, startTime, endTime, rooms, lecturer, courses, day);
    }

    private boolean isRoom(String value) {
        return value.matches("[A-Z]\\d{3,4}") || value.contains("Audimax");
    }
}