package com.survivalkit.backend.adapter.web.profile;

import com.survivalkit.backend.core.course.CoursePort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/v1/profilie")
public class ProfileController {

    private final CoursePort coursePort;

    public ProfileController(CoursePort coursePort) {
        this.coursePort = coursePort;
    }

    @Role(RoleLevel.GUEST)
    @GetMapping
    public ResponseEntity<List<String>> getAvailableCourses() {
        return ResponseEntity.ok(coursePort.getAvailableCourses());
    }

    @Role(RoleLevel.USER)
    @PostMapping
    public ResponseEntity<Void> setUserCourse(
            @RequestParam(required = false) String course,
            @RequestParam(required = false) String raplaUrl
    ) {
        coursePort.setCourseForUser(course, raplaUrl);
        return ResponseEntity.ok().build();
    }
}
