package com.survivalkit.backend.core.calendar;

import com.fasterxml.jackson.databind.JsonNode;
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

import java.util.LinkedHashMap;
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
        return new SharedCalendar(customEventService.listFor(userId), colorsFor(userId));
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

    private SharedCalendarColors colorsFor(String userId) {
        for (var widget : userWidgetPersistancePort.getAllForUser(userId)) {
            if (widget.type() != UserWidgetModel.WidgetType.LECTURE_PLAN || widget.data() == null || widget.data().isBlank()) {
                continue;
            }
            try {
                return colorsFrom(objectMapper.readTree(widget.data()));
            } catch (Exception ignored) {
                return DEFAULT_COLORS;
            }
        }
        return DEFAULT_COLORS;
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
