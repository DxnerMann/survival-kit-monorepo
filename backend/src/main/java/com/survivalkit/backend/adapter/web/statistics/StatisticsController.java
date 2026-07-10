package com.survivalkit.backend.adapter.web.statistics;

import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.core.statistics.StatisticsPort;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Statistics")
@RestController
@RequestMapping("v1/stats")
public class StatisticsController {

    private final StatisticsPort statisticsPort;

    public StatisticsController(StatisticsPort statisticsPort) {
        this.statisticsPort = statisticsPort;
    }

    @Role(RoleLevel.USER)
    @GetMapping("/userActions")
    public ResponseEntity<Page<TrackAction>> getUserActions(
            @RequestParam TrackAction.Action action,
            @RequestParam(required = false) String continuation
            ) {
        return ResponseEntity.ok(statisticsPort.getUserActions(action, continuation));
    }

    @Role(RoleLevel.USER)
    @GetMapping("/courseActions")
    public ResponseEntity<Page<TrackAction>> getCourseActions(
            @RequestParam TrackAction.Action action,
            @RequestParam(required = false) String continuation
    ) {
        return ResponseEntity.ok(statisticsPort.getCourseActions(action, continuation));
    }

    @Role(RoleLevel.GUEST)
    @GetMapping("/globalActions")
    public ResponseEntity<Page<TrackAction>> getGlobalActions(
            @RequestParam TrackAction.Action action,
            @RequestParam(required = false) String continuation
    ) {
        return ResponseEntity.ok(statisticsPort.getGlobalActions(action, continuation));
    }

    @Role(RoleLevel.USER)
    @GetMapping("/userActionSum")
    public ResponseEntity<Integer> getUserActionSum(
            @RequestParam TrackAction.Action action
    ) {
        return ResponseEntity.ok(statisticsPort.getActionSumForUser(action));
    }

    @Role(RoleLevel.USER)
    @GetMapping("/courseActionSum")
    public ResponseEntity<Integer> getCourseActionSum(
            @RequestParam TrackAction.Action action
    ) {
        return ResponseEntity.ok(statisticsPort.getActionSumForCourse(action));
    }

    @Role(RoleLevel.GUEST)
    @GetMapping("/globalActionSum")
    public ResponseEntity<Integer> getGlobalActionSum(
            @RequestParam TrackAction.Action action
    ) {
        return ResponseEntity.ok(statisticsPort.getGolbalActionSum(action));
    }

}
