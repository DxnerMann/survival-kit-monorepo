package com.survivalkit.backend.adapter.web.usertracking;

import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.core.statistics.StatisticsPort;
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

    @PostMapping("/action")
    public ResponseEntity<Void> trackAction(
            @RequestParam TrackAction.Action action,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String course
    ) {
        statisticsPort.saveTrackAction(action, userId, course);
        return ResponseEntity.ok().build();
    }
}
