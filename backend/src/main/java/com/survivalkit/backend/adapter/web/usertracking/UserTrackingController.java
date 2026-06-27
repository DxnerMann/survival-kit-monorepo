package com.survivalkit.backend.adapter.web.usertracking;

import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.core.statistics.StatisticsPort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "UserTracking")
@RestController
@RequestMapping("v1/track")
public class UserTrackingController {

    private final StatisticsPort statisticsPort;

    public UserTrackingController(StatisticsPort statisticsPort) {
        this.statisticsPort = statisticsPort;
    }

    @Role(RoleLevel.GUEST)
    @PostMapping("/action")
    public ResponseEntity<Void> trackAction(
            @RequestParam TrackAction.Action action
    ) {
        statisticsPort.saveTrackAction(action);
        return ResponseEntity.ok().build();
    }
}
