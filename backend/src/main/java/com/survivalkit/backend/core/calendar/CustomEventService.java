package com.survivalkit.backend.core.calendar;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.adapter.postgres.calendar.CustomEventInvite;
import com.survivalkit.backend.adapter.postgres.calendar.CustomEventPersistancePort;
import com.survivalkit.backend.adapter.postgres.calendar.StoredCustomEvent;
import com.survivalkit.backend.adapter.postgres.user.UserModel;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.activity.ActivityPort;
import com.survivalkit.backend.core.user.exception.UserNotFoundException;
import com.survivalkit.backend.core.websocket.WebSocketPort;
import com.survivalkit.backend.shared.WebSocketEnvelope;
import com.survivalkit.backend.shared.WebSocketMessageType;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class CustomEventService implements CustomEventPort {

    private static final Pattern CLOCK = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");
    private static final int MAX_INVITES = 25;

    private final CustomEventPersistancePort customEventPersistancePort;
    private final UserPersistancePort userPersistancePort;
    private final ActivityPort activityPort;
    private final WebSocketPort webSocketPort;
    private final ObjectMapper objectMapper;

    public CustomEventService(
            CustomEventPersistancePort customEventPersistancePort,
            UserPersistancePort userPersistancePort,
            ActivityPort activityPort,
            WebSocketPort webSocketPort,
            ObjectMapper objectMapper
    ) {
        this.customEventPersistancePort = customEventPersistancePort;
        this.userPersistancePort = userPersistancePort;
        this.activityPort = activityPort;
        this.webSocketPort = webSocketPort;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<CustomEvent> listMine() {
        var user = SecurityContext.current();
        return listFor(user.userId());
    }

    public List<CustomEvent> listFor(String userId) {
        return customEventPersistancePort.findVisible(userId).stream()
                .map(event -> toView(event, userId))
                .toList();
    }

    @Override
    @Transactional
    public CustomEvent create(CreateCustomEventCommand command) {
        SecurityContext.requireVerification();
        var user = SecurityContext.current();
        var title = requiredTitle(command.title());
        var date = requiredDate(command.date());
        var start = requiredClock(command.startTime());
        var end = requiredClock(command.endTime());
        if (minutes(end) <= minutes(start)) {
            throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_TIME_INVALID.getCode());
        }
        var room = optionalText(command.room(), 80);
        var description = optionalText(command.description(), 1000);
        var invitees = invitees(courseOrEmpty(user.userId()), user.username(), command.inviteUsernames());

        var now = Instant.now();
        var eventId = NanoId.generate(25);
        var stored = new StoredCustomEvent(eventId, user.userId(), title, date, start, end, room, description);
        customEventPersistancePort.save(stored, now);

        for (var invitee : invitees) {
            var activity = activityPort.recordEventInvited(invitee.id(), title, user.username(), eventId);
            customEventPersistancePort.saveInvite(
                    new CustomEventInvite(NanoId.generate(25), eventId, invitee.id(), "PENDING", activity.id()),
                    now
            );
            publish(invitee.id(), activity.id());
        }
        return toView(stored, user.userId());
    }

    @Override
    @Transactional
    public void respond(String eventId, boolean accept) {
        SecurityContext.requireVerification();
        var user = SecurityContext.current();
        if (eventId == null || eventId.isBlank()) {
            throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_NOT_FOUND.getCode());
        }
        var invite = customEventPersistancePort.findInvite(eventId.strip(), user.userId())
                .orElseThrow(() -> new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_NOT_FOUND.getCode()));
        if (!"PENDING".equals(invite.status())) {
            throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_ALREADY_ANSWERED.getCode());
        }
        var updated = customEventPersistancePort.markInvite(invite.eventId(), user.userId(), accept ? "ACCEPTED" : "DECLINED");
        if (updated == 0) {
            throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_ALREADY_ANSWERED.getCode());
        }
        activityPort.markEventInvite(invite.activityId(), user.userId(), accept);
        publish(user.userId(), invite.activityId());
    }

    private List<UserModel> invitees(String course, String ownerUsername, List<String> requested) {
        if (requested == null || requested.isEmpty()) {
            return List.of();
        }
        var names = requested.stream().filter(name -> name != null && !name.isBlank()).toList();
        if (names.isEmpty()) {
            return List.of();
        }
        if (course.isBlank()) {
            throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_COURSE_REQUIRED.getCode());
        }
        var canonical = new LinkedHashMap<String, String>();
        for (var username : userPersistancePort.findUsernamesByCourse(course)) {
            canonical.put(username.toLowerCase(Locale.ROOT), username);
        }
        var chosen = new ArrayList<UserModel>();
        var seen = new HashSet<String>();
        for (var raw : names) {
            var match = canonical.get(raw.strip().toLowerCase(Locale.ROOT));
            if (match == null) {
                throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_INVITE_INVALID.getCode());
            }
            if (match.equalsIgnoreCase(ownerUsername) || !seen.add(match.toLowerCase(Locale.ROOT))) {
                continue;
            }
            var invitee = userPersistancePort.findByUsername(match)
                    .orElseThrow(() -> new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_INVITE_INVALID.getCode()));
            chosen.add(invitee);
        }
        if (chosen.size() > MAX_INVITES) {
            throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_INVITE_INVALID.getCode());
        }
        return chosen;
    }

    private String courseOrEmpty(String userId) {
        var profile = userPersistancePort.getUserProfile(userId)
                .orElseThrow(() -> new UserNotFoundException(ErrorCode.USER_DOES_NOT_EXIST.getCode()));
        return profile.course() == null ? "" : profile.course().trim();
    }

    private static String requiredTitle(String title) {
        var value = title == null ? "" : title.strip();
        if (value.isEmpty() || value.length() > 120) {
            throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_TITLE_INVALID.getCode());
        }
        return value;
    }

    private static String requiredDate(String date) {
        var value = date == null ? "" : date.strip();
        try {
            return LocalDate.parse(value).toString();
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_DATE_INVALID.getCode());
        }
    }

    private static String requiredClock(String time) {
        var value = time == null ? "" : time.strip();
        if (value.length() >= 5) {
            value = value.substring(0, 5);
        }
        if (!CLOCK.matcher(value).matches()) {
            throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_TIME_INVALID.getCode());
        }
        return value;
    }

    private static String optionalText(String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        var trimmed = value.strip();
        if (trimmed.length() > max) {
            throw new IllegalArgumentException(ErrorCode.CUSTOM_EVENT_DETAILS_INVALID.getCode());
        }
        return trimmed;
    }

    private static int minutes(String time) {
        var parts = time.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }

    private static CustomEvent toView(StoredCustomEvent event, String userId) {
        return new CustomEvent(
                event.id(),
                event.title(),
                event.eventDate(),
                event.startTime(),
                event.endTime(),
                event.room(),
                event.description(),
                event.ownerUserId().equals(userId)
        );
    }

    private void publish(String userId, String activityId) {
        webSocketPort.sendToUser(
                userId,
                WebSocketEnvelope.of(
                        WebSocketMessageType.ACTIVITY,
                        objectMapper.createObjectNode().put("kind", "EVENT_INVITED").put("id", activityId == null ? "" : activityId)
                )
        );
    }
}
