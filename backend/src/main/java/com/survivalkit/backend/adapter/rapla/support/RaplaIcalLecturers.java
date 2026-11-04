package com.survivalkit.backend.adapter.rapla.support;

import com.survivalkit.backend.shared.Lecture;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.EnumSet;
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

        var index = indexForWeek(ical, monday);
        if (index.lecturers().isEmpty() && index.types().isEmpty()) {
            return lectures;
        }

        var filled = new ArrayList<Lecture>(lectures.size());
        for (var lecture : lectures) {
            var eventKey = key(lecture.day(), lecture.startTime(), lecture.title());
            var lecturer = lecture.lecturer();
            if (lecturer == null || lecturer.isBlank()) {
                var name = index.lecturers().get(eventKey);
                if (name != null && !name.isBlank()) {
                    lecturer = name;
                }
            }
            var type = index.types().getOrDefault(eventKey, lecture.type());
            if (lecturer == lecture.lecturer() && type == lecture.type()) {
                filled.add(lecture);
                continue;
            }
            filled.add(new Lecture(
                    lecture.title(),
                    type,
                    lecture.startTime(),
                    lecture.endTime(),
                    lecture.rooms(),
                    lecturer,
                    lecture.courses(),
                    lecture.day()
            ));
        }
        return filled;
    }

    static Map<String, String> lecturersForWeek(String ical, LocalDate monday) {
        return indexForWeek(ical, monday).lecturers();
    }

    private static WeekIndex indexForWeek(String ical, LocalDate monday) {
        var weekEnd = monday.plusDays(7);
        var lecturersByKey = new HashMap<String, LinkedHashSet<String>>();
        var types = new HashMap<String, Lecture.LectureType>();
        var series = new ArrayList<Event>();
        var exceptions = new ArrayList<Event>();

        for (var event : parseEvents(ical)) {
            if (event.recurrenceId != null) {
                exceptions.add(event);
            } else {
                series.add(event);
            }
        }
        for (var event : series) {
            indexEvent(event, monday, weekEnd, lecturersByKey, types, false);
        }
        for (var event : exceptions) {
            indexEvent(event, monday, weekEnd, lecturersByKey, types, true);
        }

        var lecturers = new HashMap<String, String>();
        lecturersByKey.forEach((eventKey, names) -> lecturers.put(eventKey, String.join(", ", names)));
        return new WeekIndex(lecturers, types);
    }

    private static void indexEvent(
            Event event,
            LocalDate monday,
            LocalDate weekEnd,
            Map<String, LinkedHashSet<String>> lecturersByKey,
            Map<String, Lecture.LectureType> types,
            boolean overwrite
    ) {
        var lecturer = lecturerName(event.description);
        var type = typeFromCategory(event.category);
        if (lecturer.isBlank() && type == null) {
            return;
        }
        for (var occurrence : occurrencesInWeek(event, monday, weekEnd)) {
            var eventKey = key(occurrence.day, occurrence.start, event.summary);
            if (!lecturer.isBlank()) {
                if (overwrite) {
                    var names = new LinkedHashSet<String>();
                    names.add(lecturer);
                    lecturersByKey.put(eventKey, names);
                } else {
                    lecturersByKey.computeIfAbsent(eventKey, ignored -> new LinkedHashSet<>()).add(lecturer);
                }
            }
            if (type != null) {
                if (overwrite) {
                    types.put(eventKey, type);
                } else {
                    types.putIfAbsent(eventKey, type);
                }
            }
        }
    }

    private static Lecture.LectureType typeFromCategory(String category) {
        if (category == null || category.isBlank()) {
            return null;
        }
        var sawLecture = false;
        var sawOther = false;
        for (var part : category.split(",")) {
            var trimmed = part.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            if ("Prüfung".equals(trimmed)) {
                return Lecture.LectureType.EXAM;
            }
            if ("Sonstiger Termin".equals(trimmed)) {
                sawOther = true;
            } else {
                sawLecture = true;
            }
        }
        if (sawLecture) {
            return Lecture.LectureType.LECTURE;
        }
        if (sawOther) {
            return Lecture.LectureType.OTHER;
        }
        return null;
    }

    private static String key(DayOfWeek day, String startTime, String title) {
        return day + "|" + clock(startTime) + "|" + normalizeTitle(title);
    }

    private static String normalizeTitle(String title) {
        return unescape(title == null ? "" : title)
                .replace('\u00a0', ' ')
                .replace('-', ' ')
                .replace('–', ' ')
                .replace('—', ' ')
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

        if (event.frequency == Frequency.WEEKLY && !event.byDays.isEmpty()) {
            return weeklyByDay(event, monday, weekEnd);
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

    private static List<Occurrence> weeklyByDay(Event event, LocalDate monday, LocalDate weekEnd) {
        var hits = new ArrayList<Occurrence>();
        var counted = 0;
        var limit = event.count == null ? 400 : event.count;
        var weekStart = event.start.toLocalDate().with(DayOfWeek.MONDAY);
        while (counted < limit && weekStart.isBefore(weekEnd)) {
            for (var day : event.byDays) {
                if (counted >= limit) {
                    break;
                }
                var date = weekStart.with(day);
                if (date.isBefore(event.start.toLocalDate())) {
                    continue;
                }
                if (event.until != null && date.isAfter(event.until)) {
                    continue;
                }
                addIfInside(hits, event, date, monday, weekEnd);
                counted++;
            }
            weekStart = weekStart.plusWeeks(event.interval);
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
                case "CATEGORIES" -> current.category = value;
                case "DTSTART" -> current.start = parseStamp(value);
                case "EXDATE" -> current.excluded.addAll(parseStamps(value));
                case "RECURRENCE-ID" -> current.recurrenceId = parseStamp(value);
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
                case "BYDAY" -> event.byDays.addAll(parseByDays(pieces[1]));
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

    private static EnumSet<DayOfWeek> parseByDays(String value) {
        var days = EnumSet.noneOf(DayOfWeek.class);
        for (var token : value.split(",")) {
            var letters = token.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z]", "");
            var day = switch (letters) {
                case "MO" -> DayOfWeek.MONDAY;
                case "TU" -> DayOfWeek.TUESDAY;
                case "WE" -> DayOfWeek.WEDNESDAY;
                case "TH" -> DayOfWeek.THURSDAY;
                case "FR" -> DayOfWeek.FRIDAY;
                case "SA" -> DayOfWeek.SATURDAY;
                case "SU" -> DayOfWeek.SUNDAY;
                default -> null;
            };
            if (day != null) {
                days.add(day);
            }
        }
        return days;
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

    private record WeekIndex(Map<String, String> lecturers, Map<String, Lecture.LectureType> types) {}

    private static final class Event {
        private String summary = "";
        private String description = "";
        private String category = "";
        private LocalDateTime start;
        private LocalDateTime recurrenceId;
        private final EnumSet<DayOfWeek> byDays = EnumSet.noneOf(DayOfWeek.class);
        private Frequency frequency;
        private int interval = 1;
        private Integer count;
        private LocalDate until;
        private final List<LocalDateTime> excluded = new ArrayList<>();
    }

    private record Occurrence(DayOfWeek day, String start) {}
}
