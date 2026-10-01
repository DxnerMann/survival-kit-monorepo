package com.survivalkit.backend.adapter.web.admin;

import com.survivalkit.backend.adapter.postgres.guest.Guest;
import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.adapter.web.profile.UserProfile;
import com.survivalkit.backend.core.admin.AdminHealth;
import com.survivalkit.backend.core.guest.GuestPort;
import com.survivalkit.backend.core.admin.AdminMonitoringPort;
import com.survivalkit.backend.core.admin.StorageUsage;
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

import java.util.List;

@Tag(name = "Security")
@RestController
@RequestMapping("v1/admin")
public class AdminController {

    private final SecurityLog securityLog;
    private final UserPort userPort;
    private final AdminMonitoringPort adminMonitoringPort;
    private final GuestPort guestPort;

    public AdminController(
            SecurityLog securityLog,
            UserPort userPort,
            AdminMonitoringPort adminMonitoringPort,
            GuestPort guestPort
    ) {
        this.securityLog = securityLog;
        this.userPort = userPort;
        this.adminMonitoringPort = adminMonitoringPort;
        this.guestPort = guestPort;
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

    @Role(RoleLevel.ADMIN)
    @GetMapping("guests")
    public ResponseEntity<List<Guest>> getGuests() {
        return ResponseEntity.ok(guestPort.activeGuests());
    }

    @Role(RoleLevel.ADMIN)
    @GetMapping("health")
    public ResponseEntity<AdminHealth> health() {
        return ResponseEntity.ok(adminMonitoringPort.health());
    }

    @Role(RoleLevel.ADMIN)
    @GetMapping("monitoring/storage")
    public ResponseEntity<StorageUsage> storage() {
        return ResponseEntity.ok(adminMonitoringPort.storage());
    }
}
