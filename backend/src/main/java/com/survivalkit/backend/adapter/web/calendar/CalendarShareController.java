package com.survivalkit.backend.adapter.web.calendar;

import com.survivalkit.backend.core.calendar.CalendarShareLink;
import com.survivalkit.backend.core.calendar.CalendarShareService;
import com.survivalkit.backend.core.calendar.SharedCalendar;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Calendar sharing")
@RestController
@RequestMapping("v1/calendar")
public class CalendarShareController {

    private final CalendarShareService calendarShareService;

    public CalendarShareController(CalendarShareService calendarShareService) {
        this.calendarShareService = calendarShareService;
    }

    @Role(RoleLevel.USER)
    @GetMapping("share")
    public ResponseEntity<CalendarShareLink> shareMine() {
        return ResponseEntity.ok(calendarShareService.shareMine());
    }

    @Role(RoleLevel.GUEST)
    @GetMapping("shared")
    public ResponseEntity<SharedCalendar> view(@RequestParam String code) {
        return ResponseEntity.ok(calendarShareService.view(code));
    }

    @Role(RoleLevel.USER)
    @PutMapping("hidden")
    public ResponseEntity<Void> saveHidden(@RequestBody CalendarHiddenRequest request) {
        calendarShareService.saveHiddenLectures(request.hiddenLectures());
        return ResponseEntity.noContent().build();
    }
}
