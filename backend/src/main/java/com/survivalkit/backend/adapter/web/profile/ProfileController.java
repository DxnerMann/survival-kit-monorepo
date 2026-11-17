package com.survivalkit.backend.adapter.web.profile;

import com.survivalkit.backend.core.course.CoursePort;
import com.survivalkit.backend.core.rank.UserRankView;
import com.survivalkit.backend.core.rank.XpPort;
import com.survivalkit.backend.core.user.UserPort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Profile")
@RestController
@RequestMapping("v1/profile")
public class ProfileController {

    private final CoursePort coursePort;
    private final UserPort userPort;
    private final XpPort xpPort;

    public ProfileController(CoursePort coursePort, UserPort userPort, XpPort xpPort) {
        this.coursePort = coursePort;
        this.userPort = userPort;
        this.xpPort = xpPort;
    }

    @Role(RoleLevel.USER)
    @GetMapping("rank")
    public ResponseEntity<UserRankView> myRank() {
        return ResponseEntity.ok(xpPort.mine());
    }

    @Role(RoleLevel.GUEST)
    @GetMapping("leaderboard")
    public ResponseEntity<List<UserRankView>> leaderboard() {
        return ResponseEntity.ok(xpPort.leaderboard(10));
    }

    @Role(RoleLevel.USER)
    @PutMapping("leaderboard")
    public ResponseEntity<Void> updateLeaderboardVisibility(@RequestParam boolean visible) {
        userPort.updateShowInLeaderboard(visible);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @GetMapping("ranks")
    public ResponseEntity<List<UserRankView>> ranks(@RequestParam List<String> userIds) {
        var ids = userIds.stream().filter(id -> id != null && !id.isBlank()).distinct().limit(80).toList();
        return ResponseEntity.ok(xpPort.findByUsers(ids));
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

    @Role(RoleLevel.USER)
    @PostMapping("/img")
    @PutMapping("/img")
    public ResponseEntity<Void> uploadProfileImage(
            @RequestParam MultipartFile file
    ) {
        userPort.updateProfilePicture(file);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/img/{userId}")
    public ResponseEntity<Resource> getProfilePicture(@PathVariable String userId) {
        var response = userPort.getProfilePicture(userId);
        return ResponseEntity.ok()
                .contentType(response.contentType())
                .body(response.resource());
    }

    @Role(RoleLevel.USER)
    @PutMapping()
    public ResponseEntity<Void> updateUsername(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) String accentColor
    ) {
        if (username != null) {
            userPort.updateUsername(username);
        }
        if (color != null) {
            userPort.updateColor(color);
        }
        if (accentColor != null) {
            userPort.updateAccentColor(accentColor);
        }
        return ResponseEntity.ok().build();
    }
}
