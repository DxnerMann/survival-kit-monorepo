package com.survivalkit.backend.adapter.rapla.support;

import com.survivalkit.backend.shared.Lecture;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

public final class RaplaIcalLecturers {

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");
    private static final Pattern PERSONEN = Pattern.compile("Personen:\\s*(.*?)(?:\\s+Ressourcen:|$)", Pattern.DOTALL);

    private RaplaIcalLecturers() {}

    public static List<Lecture> apply(List<Lecture> lectures, String ical, LocalDate monday) {
        if (lectures.isEmpty() || ical == null || ical.isBlank() || monday == null) {
            return lectures;
        }

        var lecturers = lecturersForWeek(ical, monday);
        if (lecturers.isEmpty()) {
            return lectures;
        }

        var filled = new ArrayList<Lecture>(lectures.size());
        for (var lecture : lectures) {
            if (lecture.lecturer() != null && !lecture.lecturer().isBlank()) {
                filled.add(lecture);
                continue;
            }
            var name = lecturers.get(key(lecture.day(), lecture.startTime(), lecture.title()));
            if (name == null || name.isBlank()) {
                filled.add(lecture);
                continue;
            }
            filled.add(new Lecture(
                    lecture.title(),
                    lecture.type(),
                    lecture.startTime(),
                    lecture.endTime(),
                    lecture.rooms(),
                    name,
                    lecture.courses(),
                    lecture.day()
            ));
        }
        return filled;
    }

    static Map<String, String> lecturersForWeek(String ical, LocalDate monday) {
        var weekEnd = monday.plusDays(7);
        var byKey = new HashMap<String, LinkedHashSet<String>>();

        for (var event : parseEvents(ical)) {
            var lecturer = lecturerName(event.description);
            if (lecturer.isBlank()) {
                continue;
            }
            for (var occurrence : occurrencesInWeek(event, monday, weekEnd)) {
                byKey.computeIfAbsent(key(occurrence.day, occurrence.start, event.summary), ignored -> new LinkedHashSet<>())
                        .add(lecturer);
            }
        }

        var joined = new HashMap<String, String>();
        byKey.forEach((eventKey, names) -> joined.put(eventKey, String.join(", ", names)));
        return joined;
    }

    private static String key(DayOfWeek day, String startTime, String title) {
        return day + "|" + clock(startTime) + "|" + normalizeTitle(title);
    }

    private static String normalizeTitle(String title) {
        return unescape(title == null ? "" : title)
                .replace('\u00a0', ' ')
                .replaceAll("\\s+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private static String clock(String startTime) {
        var parts = (startTime == null ? "" : startTime).split(":");
        if (parts.length < 2) {
            return startTime == null ? "" : startTime;
        }
        try {
            return String.format("%02d:%02d", Integer.parseInt(parts[0].trim()), Integer.parseInt(parts[1].trim()));
        } catch (NumberFormatException ex) {
            return startTime;
        }
    }

    private static String lecturerName(String description) {
        var matcher = PERSONEN.matcher(description == null ? "" : description);
        if (!matcher.find()) {
            return "";
        }
        var parts = matcher.group(1).split("\\\\,");
        var names = new ArrayList<String>();
        for (var index = 0; index + 1 < parts.length; index += 2) {
            var last = unescape(parts[index]).trim();
            var first = unescape(parts[index + 1]).trim();
            if (last.isBlank() && first.isBlank()) {
                continue;
            }
            names.add(first.isBlank() ? last : first + " " + last);
        }
        if (parts.length % 2 == 1) {
            var leftover = unescape(parts[parts.length - 1]).trim();
            if (!leftover.isBlank()) {
                names.add(leftover);
            }
        }
        return String.join(", ", names);
    }

    private static String unescape(String value) {
        return value.replace("\\n", " ")
                .replace("\\N", " ")
                .replace("\\,", ",")
                .replace("\\;", ";")
                .replace("\\\\", "\\");
    }

    private static List<Occurrence> occurrencesInWeek(Event event, LocalDate monday, LocalDate weekEnd) {
        var hits = new ArrayList<Occurrence>();
        if (event.start == null) {
            return hits;
        }

        if (event.frequency == null) {
            addIfInside(hits, event, event.start.toLocalDate(), monday, weekEnd);
            return hits;
        }

        var cursor = event.start.toLocalDate();
        var produced = 0;
        var limit = event.count == null ? 400 : event.count;
        while (produced < limit && !cursor.isAfter(weekEnd.plusYears(1))) {
            if (event.until != null && cursor.isAfter(event.until)) {
                break;
            }
            addIfInside(hits, event, cursor, monday, weekEnd);
            produced++;
            if (!cursor.isBefore(weekEnd) && (event.frequency == Frequency.WEEKLY || event.frequency == Frequency.DAILY)) {
                break;
            }
            cursor = switch (event.frequency) {
                case WEEKLY -> cursor.plusWeeks(event.interval);
                case DAILY -> cursor.plusDays(event.interval);
                case YEARLY -> cursor.plusYears(event.interval);
            };
            if (event.frequency == Frequency.YEARLY && cursor.getYear() > monday.getYear() + 1) {
                break;
            }
        }
        return hits;
    }

    private static void addIfInside(
            List<Occurrence> hits,
            Event event,
            LocalDate date,
            LocalDate monday,
            LocalDate weekEnd
    ) {
        if (date.isBefore(monday) || !date.isBefore(weekEnd)) {
            return;
        }
        var stamp = date.atTime(event.start.toLocalTime());
        if (event.excluded.contains(stamp) || event.excluded.contains(date.atStartOfDay())) {
            return;
        }
        hits.add(new Occurrence(date.getDayOfWeek(), event.start.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))));
    }

    private static List<Event> parseEvents(String ical) {
        var events = new ArrayList<Event>();
        Event current = null;
        for (var line : unfold(ical)) {
            if ("BEGIN:VEVENT".equals(line)) {
                current = new Event();
                continue;
            }
            if ("END:VEVENT".equals(line)) {
                if (current != null && current.start != null) {
                    events.add(current);
                }
                current = null;
                continue;
            }
            if (current == null) {
                continue;
            }
            var name = propertyName(line);
            var value = propertyValue(line);
            switch (name) {
                case "SUMMARY" -> current.summary = value;
                case "DESCRIPTION" -> current.description = value;
                case "DTSTART" -> current.start = parseStamp(value);
                case "EXDATE" -> current.excluded.addAll(parseStamps(value));
                case "RRULE" -> applyRule(current, value);
                default -> {
                }
            }
        }
        return events;
    }

    private static void applyRule(Event event, String value) {
        var count = (Integer) null;
        var until = (LocalDate) null;
        var interval = 1;
        Frequency frequency = null;
        for (var part : value.split(";")) {
            var pieces = part.split("=", 2);
            if (pieces.length != 2) {
                continue;
            }
            switch (pieces[0]) {
                case "FREQ" -> frequency = switch (pieces[1]) {
                    case "WEEKLY" -> Frequency.WEEKLY;
                    case "DAILY" -> Frequency.DAILY;
                    case "YEARLY" -> Frequency.YEARLY;
                    default -> null;
                };
                case "INTERVAL" -> interval = parseInt(pieces[1], 1);
                case "COUNT" -> count = parseInt(pieces[1], 0);
                case "UNTIL" -> until = untilDate(pieces[1]);
                default -> {
                }
            }
        }
        if (frequency == null || interval < 1) {
            return;
        }
        event.frequency = frequency;
        event.interval = interval;
        event.count = count != null && count > 0 ? count : null;
        event.until = until;
    }

    private static LocalDate untilDate(String value) {
        var stamp = parseStamp(value.replace("Z", ""));
        return stamp == null ? null : stamp.toLocalDate();
    }

    private static int parseInt(String value, int fallback) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private static List<LocalDateTime> parseStamps(String value) {
        var stamps = new ArrayList<LocalDateTime>();
        for (var part : value.split(",")) {
            var stamp = parseStamp(part.trim());
            if (stamp != null) {
                stamps.add(stamp);
            }
        }
        return stamps;
    }

    private static LocalDateTime parseStamp(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        var cleaned = value.endsWith("Z") ? value.substring(0, value.length() - 1) : value;
        try {
            if (cleaned.length() == 8) {
                return LocalDate.parse(cleaned, DateTimeFormatter.BASIC_ISO_DATE).atStartOfDay();
            }
            return LocalDateTime.parse(cleaned, STAMP);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private static List<String> unfold(String ical) {
        var lines = new ArrayList<String>();
        for (var raw : ical.split("\\R")) {
            if (raw.startsWith(" ") || raw.startsWith("\t")) {
                if (!lines.isEmpty()) {
                    lines.set(lines.size() - 1, lines.getLast() + raw.substring(1));
                }
                continue;
            }
            if (!raw.isBlank()) {
                lines.add(raw);
            }
        }
        return lines;
    }

    private static String propertyName(String line) {
        var separator = line.indexOf(':');
        var head = separator < 0 ? line : line.substring(0, separator);
        var parameter = head.indexOf(';');
        return parameter < 0 ? head : head.substring(0, parameter);
    }

    private static String propertyValue(String line) {
        var separator = line.indexOf(':');
        return separator < 0 ? "" : line.substring(separator + 1);
    }

    private enum Frequency {
        DAILY,
        WEEKLY,
        YEARLY
    }

    private static final class Event {
        private String summary = "";
        private String description = "";
        private LocalDateTime start;
        private Frequency frequency;
        private int interval = 1;
        private Integer count;
        private LocalDate until;
        private final List<LocalDateTime> excluded = new ArrayList<>();
    }

    private record Occurrence(DayOfWeek day, String start) {}
}
