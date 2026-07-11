package com.survivalkit.backend.adapter.web.admin;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.adapter.web.profile.UserProfile;
import com.survivalkit.backend.core.security.SecurityLog;
import com.survivalkit.backend.core.user.UserPort;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Security")
@RestController
@RequestMapping("v1/admin")
public class AdminController {

    private final SecurityLog securityLog;
    private final UserPort userPort;

    public AdminController(SecurityLog securityLog, UserPort userPort) {
        this.securityLog = securityLog;
        this.userPort = userPort;
    }

    @Role(RoleLevel.ADMIN)
    @GetMapping("logs")
    public ResponseEntity<Page<Log>> getLatestLogs(
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String continuation
    ) {
        return ResponseEntity.ok(securityLog.getLogs(pageSize, continuation));
    }

    @Role(RoleLevel.ADMIN)
    @GetMapping("users")
    public ResponseEntity<Page<UserProfile>> getUsers(
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String continuation
    ) {
        return ResponseEntity.ok(userPort.getUsers(pageSize, continuation));
    }

    @Role(RoleLevel.ADMIN)
    @PutMapping("users/promote")
    public ResponseEntity<Page<UserProfile>> getUsers(
            @RequestParam String userId,
            @RequestParam RoleLevel role
    ) {
        userPort.promote(userId, role);
        return ResponseEntity.ok().build();
    }
}
