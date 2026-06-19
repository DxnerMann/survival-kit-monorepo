package com.survivalkit.backend.adapter.web.daily;

import com.survivalkit.backend.core.daily.DailyEventPort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/daily")
public class DailyEventController {

    private final DailyEventPort dailyEventPort;

    public DailyEventController(DailyEventPort dailyEventPort) {
        this.dailyEventPort = dailyEventPort;
    }

    @Role(RoleLevel.GUEST)
    @GetMapping("/cat")
    public ResponseEntity<byte[]> getDailyCatImage() {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(dailyEventPort.getTodaysCatImage());
    }
}
