package com.survivalkit.backend.adapter.rapla.support;

import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.shared.Lecture;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public final class WeekTableLectureParser {

    private WeekTableLectureParser() {}

    public static List<Lecture> parse(Document document) {
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

                var lecture = parseWeekBlock(cell);
                if (lecture != null) {
                    lectures.add(lecture);
                }
            }
        }

        return lectures;
    }

    private static Lecture parseWeekBlock(Element cell) {
        var anchor = cell.selectFirst("a");
        if (anchor == null) {
            return null;
        }

        var type = Lecture.LectureType.OTHER;
        var strongEl = cell.selectFirst("span.tooltip strong");
        if (strongEl != null) {
            type = switch (strongEl.text().trim()) {
                case "Lehrveranstaltung" -> Lecture.LectureType.LECTURE;
                case "Prüfung" -> Lecture.LectureType.EXAM;
                default -> Lecture.LectureType.OTHER;
            };
        } else {
            var style = cell.attr("style");
            if (style.contains("background-color:")) {
                var color = style.replaceAll(".*background-color:\\s*", "").replaceAll(";.*", "").trim();
                type = switch (color.toUpperCase()) {
                    case "#EEEEEE" -> Lecture.LectureType.LECTURE;
                    case "#FF0000" -> Lecture.LectureType.EXAM;
                    default -> Lecture.LectureType.OTHER;
                };
            }
        }

        var title = "";
        var startTime = "";
        var endTime = "";

        var textNodes = anchor.textNodes();
        if (!textNodes.isEmpty()) {
            var timeLine = textNodes.get(0).text().trim()
                    .replace("\u00a0", "")
                    .replace(" ", "");

            var timeParts = timeLine.split("-");
            if (timeParts.length == 2) {
                startTime = timeParts[0].trim();
                endTime = timeParts[1].trim();
            }
        }
        if (textNodes.size() > 1) {
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

        var personSpans = cell.select("span.person");
        var lecturer = personSpans.stream()
                .map(Element::text)
                .collect(Collectors.joining(", "));

        var resourceSpans = cell.select("span.resource");
        var rooms = new ArrayList<String>();
        var courses = new ArrayList<String>();

        for (var span : resourceSpans) {
            var value = span.text().trim();
            if (isRoom(value)) {
                rooms.add(value);
            } else {
                courses.add(value);
            }
        }

        var day = DayOfWeek.MONDAY;
        var dateDivs = cell.select("span.tooltip div");
        if (dateDivs.size() >= 2) {
            var dateText = dateDivs.get(1).text().trim();
            day = switch (dateText.substring(0, 2)) {
                case "Mo" -> DayOfWeek.MONDAY;
                case "Di" -> DayOfWeek.TUESDAY;
                case "Mi" -> DayOfWeek.WEDNESDAY;
                case "Do" -> DayOfWeek.THURSDAY;
                case "Fr" -> DayOfWeek.FRIDAY;
                case "Sa" -> DayOfWeek.SATURDAY;
                case "So" -> DayOfWeek.SUNDAY;
                default -> DayOfWeek.MONDAY;
            };
        }

        return new Lecture(title, type, startTime, endTime, rooms, lecturer, courses, day);
    }

    private static boolean isRoom(String value) {
        return value.matches("[A-Z]\\d{3,4}") || value.contains("Audimax");
    }
}
