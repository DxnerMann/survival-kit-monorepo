package com.survivalkit.backend.adapter.web.security;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.core.security.SecurityLog;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Security")
@RestController
@RequestMapping("v1/security")
public class SecurityController {

    private final SecurityLog securityLog;

    public SecurityController(SecurityLog securityLog) {
        this.securityLog = securityLog;
    }

    @Role(RoleLevel.ADMIN)
    @GetMapping("logs")
    public ResponseEntity<Page<Log>> getLatestLogs(
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String continuation
    ) {
        return ResponseEntity.ok(securityLog.getLogs(pageSize, continuation));
    }
}
