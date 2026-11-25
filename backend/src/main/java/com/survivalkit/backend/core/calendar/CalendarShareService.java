package com.survivalkit.backend.core.calendar;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.postgres.widget.UserWidgetModel;
import com.survivalkit.backend.adapter.postgres.widget.UserWidgetPersistancePort;
import com.survivalkit.backend.adapter.rapla.support.RaplaUrlSupport;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.user.exception.UserNotFoundException;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class CalendarShareService {

    private static final Pattern HEX = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final SharedCalendarColors DEFAULT_COLORS = new SharedCalendarColors(
            "#bc0101",
            "#e8ba02",
            "#bdbdbd",
            "#2563eb"
    );

    private final UserPersistancePort userPersistancePort;
    private final CoursePersistancePort coursePersistancePort;
    private final UserWidgetPersistancePort userWidgetPersistancePort;
    private final CustomEventService customEventService;
    private final ObjectMapper objectMapper;

    public CalendarShareService(
            UserPersistancePort userPersistancePort,
            CoursePersistancePort coursePersistancePort,
            UserWidgetPersistancePort userWidgetPersistancePort,
            CustomEventService customEventService,
            ObjectMapper objectMapper
    ) {
        this.userPersistancePort = userPersistancePort;
        this.coursePersistancePort = coursePersistancePort;
        this.userWidgetPersistancePort = userWidgetPersistancePort;
        this.customEventService = customEventService;
        this.objectMapper = objectMapper;
    }

    public CalendarShareLink shareMine() {
        var user = SecurityContext.current();
        var code = ensureCode(user.userId());
        var profile = userPersistancePort.getUserProfile(user.userId())
                .orElseThrow(() -> new UserNotFoundException(ErrorCode.USER_DOES_NOT_EXIST.getCode()));
        var course = profile.course() == null ? "" : profile.course().trim();
        if (course.isEmpty()) {
            return new CalendarShareLink(code, null);
        }
        var raplaUrl = coursePersistancePort.getCourseRaplaConfig(course)
                .filter(config -> config.url() != null && !config.url().isBlank())
                .map(config -> withAccessCode(config.url().trim(), code))
                .orElse(null);
        return new CalendarShareLink(code, raplaUrl);
    }

    public SharedCalendar view(String code) {
        var normalized = code == null ? "" : code.trim();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException(ErrorCode.CALENDAR_ACCESS_CODE_INVALID.getCode());
        }
        var userId = userPersistancePort.findUserIdByCalendarAccessCode(normalized)
                .orElseThrow(() -> new IllegalArgumentException(ErrorCode.CALENDAR_ACCESS_CODE_INVALID.getCode()));
        var plan = planSettings(userId);
        var accent = userPersistancePort.getUserProfile(userId)
                .map(profile -> colorValue(profile.accentColor()))
                .orElse(null);
        return new SharedCalendar(customEventService.listFor(userId), plan.colors(), accent, plan.hiddenLectures());
    }

    public void saveHiddenLectures(List<String> hiddenLectures) {
        var user = SecurityContext.current();
        var cleaned = cleanHidden(hiddenLectures);
        UserWidgetModel fallback = null;
        var saved = false;
        for (var widget : userWidgetPersistancePort.getAllForUser(user.userId())) {
            if (widget.type() != UserWidgetModel.WidgetType.LECTURE_PLAN) {
                continue;
            }
            if (fallback == null) {
                fallback = widget;
            }
            if (widget.data() == null || widget.data().isBlank()) {
                continue;
            }
            saved = writeHidden(widget, user.userId(), cleaned) || saved;
        }
        if (!saved && fallback != null) {
            writeHidden(fallback, user.userId(), cleaned);
        }
    }

    private boolean writeHidden(UserWidgetModel widget, String userId, List<String> hiddenLectures) {
        var node = readObject(widget.data());
        var hidden = node.putArray("hiddenLectures");
        hiddenLectures.forEach(hidden::add);
        try {
            userWidgetPersistancePort.saveDataForWidget(widget.id(), userId, objectMapper.writeValueAsString(node));
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private String ensureCode(String userId) {
        var existing = userPersistancePort.findCalendarAccessCode(userId);
        if (existing.isPresent()) {
            return existing.get();
        }
        var generated = NanoId.generate(21);
        if (userPersistancePort.setCalendarAccessCodeIfMissing(userId, generated) == 0) {
            return userPersistancePort.findCalendarAccessCode(userId)
                    .orElse(generated);
        }
        return generated;
    }

    private PlanSettings planSettings(String userId) {
        for (var widget : userWidgetPersistancePort.getAllForUser(userId)) {
            if (widget.type() != UserWidgetModel.WidgetType.LECTURE_PLAN || widget.data() == null || widget.data().isBlank()) {
                continue;
            }
            try {
                var node = objectMapper.readTree(widget.data());
                return new PlanSettings(colorsFrom(node), hiddenFrom(node));
            } catch (Exception ignored) {
                return new PlanSettings(DEFAULT_COLORS, List.of());
            }
        }
        return new PlanSettings(DEFAULT_COLORS, List.of());
    }

    private ObjectNode readObject(String data) {
        if (data == null || data.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            var parsed = objectMapper.readTree(data);
            if (parsed instanceof ObjectNode object) {
                return object;
            }
        } catch (Exception ignored) {
            // Replace unreadable widget data with a fresh object.
        }
        return objectMapper.createObjectNode();
    }

    private static List<String> hiddenFrom(JsonNode node) {
        var hidden = node.path("hiddenLectures");
        if (!hidden.isArray()) {
            return List.of();
        }
        var names = new ArrayList<String>();
        hidden.forEach(item -> {
            if (item.isTextual()) {
                var value = item.asText().trim();
                if (!value.isEmpty()) {
                    names.add(value);
                }
            }
        });
        return names;
    }

    private static List<String> cleanHidden(List<String> hiddenLectures) {
        var cleaned = new ArrayList<String>();
        if (hiddenLectures == null) {
            return cleaned;
        }
        for (var item : hiddenLectures) {
            if (item == null || cleaned.size() >= 200) {
                continue;
            }
            var value = item.strip();
            if (!value.isEmpty() && value.length() <= 200) {
                cleaned.add(value);
            }
        }
        return cleaned;
    }

    private static String colorValue(String value) {
        var trimmed = value == null ? "" : value.trim();
        return HEX.matcher(trimmed).matches() ? trimmed : null;
    }

    private record PlanSettings(SharedCalendarColors colors, List<String> hiddenLectures) {
    }

    private static SharedCalendarColors colorsFrom(JsonNode node) {
        return new SharedCalendarColors(
                color(node, "lectureColor", DEFAULT_COLORS.lecture()),
                color(node, "examColor", DEFAULT_COLORS.exam()),
                color(node, "otherColor", DEFAULT_COLORS.other()),
                color(node, "customColor", DEFAULT_COLORS.custom())
        );
    }

    private static String color(JsonNode node, String field, String fallback) {
        var value = node.path(field).asText("").trim();
        return HEX.matcher(value).matches() ? value : fallback;
    }

    static String withAccessCode(String raplaUrl, String code) {
        var params = new LinkedHashMap<>(RaplaUrlSupport.parseQueryParams(raplaUrl));
        params.remove("code");
        params.put("code", code);
        var query = new StringBuilder();
        for (var entry : params.entrySet()) {
            if (entry.getValue() == null) {
                continue;
            }
            if (!query.isEmpty()) {
                query.append('&');
            }
            query.append(RaplaUrlSupport.encodeQueryParam(entry.getKey()));
            query.append('=');
            query.append(RaplaUrlSupport.encodeQueryParam(entry.getValue()));
        }
        return RaplaUrlSupport.rebuildUri(raplaUrl, query.toString());
    }
}
