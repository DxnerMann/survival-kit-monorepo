package com.survivalkit.backend.adapter.web.lecture;

import com.survivalkit.backend.core.lecture.LecturePort;
import com.survivalkit.backend.shared.Lecture;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/lecture")
public class LecturePlanController {

    private final LecturePort lecturePort;

    public LecturePlanController(LecturePort lecturePort) {
        this.lecturePort = lecturePort;
    }

    @Role(RoleLevel.GUEST)
    @GetMapping("/week")
    public ResponseEntity<List<Lecture>> getLecturesForWeek(
            @RequestParam int weekOffset,
            @RequestParam(required = false) String course,
            @RequestParam(required = false) String raplaUrl
    ) {
        return ResponseEntity.ok(lecturePort.getLecturesForWeek(weekOffset, course, raplaUrl));
    }
}
