package com.survivalkit.backend.adapter.rapla.support;

import com.survivalkit.backend.shared.Lecture;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public final class WeekTableLectureParser {

    private static final Pattern ANCHOR_TIME_TITLE = Pattern.compile(
            "^(\\d{1,2}:\\d{2})\\s*-\\s*(\\d{1,2}:\\d{2})(?:\\s+(.*))?$"
    );

    private WeekTableLectureParser() {}

    public static List<Lecture> parse(Document document) {
        var lectures = new ArrayList<Lecture>();
        var rows = document.select("table.week_table tbody tr");
        if (rows.isEmpty()) {
            rows = document.select("table.week_table tr");
        }

        var dayByColumn = dayColumns(rows);
        var pendingRowspan = new HashMap<Integer, Integer>();

        for (var row : rows) {
            var nextRowspan = new HashMap<Integer, Integer>();
            var col = 0;

            for (var cell : row.children()) {
                while (pendingRowspan.getOrDefault(col, 0) > 0) {
                    var remaining = pendingRowspan.get(col) - 1;
                    if (remaining > 0) {
                        nextRowspan.put(col, remaining);
                    }
                    col++;
                }

                var colspan = span(cell, "colspan");
                var rowspan = span(cell, "rowspan");

                if (cell.hasClass("week_block")) {
                    var day = dayFromTooltip(cell).orElse(dayByColumn.getOrDefault(col, DayOfWeek.MONDAY));
                    var lecture = parseWeekBlock(cell, day);
                    if (lecture != null) {
                        lectures.add(lecture);
                    }
                }

                if (rowspan > 1) {
                    for (var offset = 0; offset < colspan; offset++) {
                        nextRowspan.put(col + offset, rowspan - 1);
                    }
                }
                col += colspan;
            }

            pendingRowspan = nextRowspan;
        }

        return lectures;
    }

    private static Map<Integer, DayOfWeek> dayColumns(List<Element> rows) {
        var dayByColumn = new HashMap<Integer, DayOfWeek>();
        for (var row : rows) {
            if (row.select("td.week_header, th.week_header").isEmpty()) {
                continue;
            }

            var col = 0;
            for (var cell : row.children()) {
                var colspan = span(cell, "colspan");
                var day = dayFromLabel(cell.text());
                if (day != null) {
                    for (var offset = 0; offset < colspan; offset++) {
                        dayByColumn.put(col + offset, day);
                    }
                }
                col += colspan;
            }
            break;
        }
        return dayByColumn;
    }

    private static Lecture parseWeekBlock(Element cell, DayOfWeek columnDay) {
        var anchor = cell.selectFirst("a");
        if (anchor == null) {
            return null;
        }

        var type = lectureType(cell);
        var title = "";
        var startTime = "";
        var endTime = "";

        var textNodes = anchor.textNodes();
        if (!textNodes.isEmpty()) {
            var normalized = textNodes.get(0).text().trim()
                    .replace('\u00a0', ' ')
                    .replaceAll("\\s+", " ")
                    .trim();
            var matcher = ANCHOR_TIME_TITLE.matcher(normalized);
            if (matcher.matches()) {
                startTime = matcher.group(1);
                endTime = matcher.group(2);
                if (matcher.group(3) != null && !matcher.group(3).isBlank()) {
                    title = matcher.group(3).trim();
                }
            }
        }
        if (textNodes.size() > 1 && title.isEmpty()) {
            title = textNodes.get(1).text().trim();
        }

        if (title.isEmpty()) {
            for (var row : cell.select("table.infotable tr")) {
                if (row.selectFirst(".label") != null
                        && row.selectFirst(".label").text().contains("Titel")) {
                    title = row.selectFirst(".value").text().trim();
                    break;
                }
            }
        }

        var lecturer = cell.select("span.person").stream()
                .map(Element::text)
                .collect(Collectors.joining(", "));

        var rooms = new ArrayList<String>();
        var courses = new ArrayList<String>();
        for (var span : cell.select("span.resource")) {
            var value = span.text().trim();
            if (isRoom(value)) {
                rooms.add(value);
            } else {
                courses.add(value);
            }
        }

        var day = dayFromTooltip(cell).orElse(columnDay);
        return new Lecture(title, type, startTime, endTime, rooms, lecturer, courses, day);
    }

    private static Lecture.LectureType lectureType(Element cell) {
        var strongEl = cell.selectFirst("span.tooltip strong");
        if (strongEl != null) {
            return switch (strongEl.text().trim()) {
                case "Lehrveranstaltung" -> Lecture.LectureType.LECTURE;
                case "Prüfung" -> Lecture.LectureType.EXAM;
                default -> Lecture.LectureType.OTHER;
            };
        }

        var style = cell.attr("style");
        if (style.contains("background-color:")) {
            var color = style.replaceAll(".*background-color:\\s*", "").replaceAll(";.*", "").trim();
            return switch (color.toUpperCase()) {
                case "#EEEEEE" -> Lecture.LectureType.LECTURE;
                case "#FF0000" -> Lecture.LectureType.EXAM;
                default -> Lecture.LectureType.OTHER;
            };
        }
        return Lecture.LectureType.OTHER;
    }

    private static java.util.Optional<DayOfWeek> dayFromTooltip(Element cell) {
        for (var div : cell.select("span.tooltip div")) {
            var day = dayFromLabel(div.text());
            if (day != null) {
                return java.util.Optional.of(day);
            }
        }
        return java.util.Optional.empty();
    }

    private static DayOfWeek dayFromLabel(String text) {
        var trimmed = text == null ? "" : text.trim();
        if (trimmed.length() < 2) {
            return null;
        }
        return switch (trimmed.substring(0, 2)) {
            case "Mo" -> DayOfWeek.MONDAY;
            case "Di" -> DayOfWeek.TUESDAY;
            case "Mi" -> DayOfWeek.WEDNESDAY;
            case "Do" -> DayOfWeek.THURSDAY;
            case "Fr" -> DayOfWeek.FRIDAY;
            case "Sa" -> DayOfWeek.SATURDAY;
            case "So" -> DayOfWeek.SUNDAY;
            default -> null;
        };
    }

    private static int span(Element cell, String attribute) {
        var raw = cell.attr(attribute);
        if (raw == null || raw.isBlank()) {
            return 1;
        }
        try {
            return Math.max(1, Integer.parseInt(raw.trim()));
        } catch (NumberFormatException ex) {
            return 1;
        }
    }

    private static boolean isRoom(String value) {
        return value.matches("[A-Z]\\d{3,4}.*")
                || value.contains("Audimax")
                || value.contains("Hörsaal")
                || value.contains("Labor");
    }
}
