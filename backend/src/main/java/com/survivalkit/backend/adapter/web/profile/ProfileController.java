package com.survivalkit.backend.adapter.web.profile;

import com.survivalkit.backend.core.course.CoursePort;
import com.survivalkit.backend.core.user.UserPort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Profile")
@RestController
@RequestMapping("v1/profile")
public class ProfileController {

    private final CoursePort coursePort;
    private final UserPort userPort;

    public ProfileController(CoursePort coursePort, UserPort userPort) {
        this.coursePort = coursePort;
        this.userPort = userPort;
    }

    @Role(RoleLevel.USER)
    @GetMapping
    public ResponseEntity<UserProfile> getProfile() {
        return ResponseEntity.ok(userPort.getUserProfile());
    }


    @Role(RoleLevel.GUEST)
    @GetMapping("courses")
    public ResponseEntity<List<String>> getAvailableCourses() {
        return ResponseEntity.ok(coursePort.getAvailableCourses());
    }

    @Role(RoleLevel.USER)
    @PostMapping("course")
    public ResponseEntity<Void> setUserCourse(
            @RequestParam String course
    ) {
        userPort.setCourseForUser(course);
        return ResponseEntity.ok().build();
    }

    /*
    * TODO:
    *  - Get Profile Picture via Endpoint
    *       - Default Pb if not present
    *  - Set Profile Picture Endpoint
    *  - Change Username via Endpoint
    *       - Add lastUpdated timestamp to make changing possible only every 30 days
    *  - Change Email Endpoint
    *       - Reset Verification / Rework Verification (maybe make it possible to log in, but not do anything)
    *  - Add Custom Profile Accent Color Functionality
     */
}
