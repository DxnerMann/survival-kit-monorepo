package com.survivalkit.backend.adapter.web.dashboard;

import com.survivalkit.backend.adapter.postgres.widget.UserWidgetModel;
import com.survivalkit.backend.core.dashboard.WidgetQueryPort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/v1/dashboard")
public class DashboardController {

    private final WidgetQueryPort widgetQueryPort;

    public DashboardController(WidgetQueryPort widgetQueryPort) {
        this.widgetQueryPort = widgetQueryPort;
    }

    @Role(RoleLevel.USER)
    @GetMapping
    public ResponseEntity<List<UserWidgetModel>> getDashboardLayout() {
        return ResponseEntity.ok(widgetQueryPort.getAllWidgets());
    }

    @Role(RoleLevel.USER)
    @PostMapping
    public ResponseEntity<Void> saveDashboardLayout(
            @RequestBody List<UserWidgetModel> userWidgetModels
    ) {
        widgetQueryPort.saveAllWidgets(userWidgetModels);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @PostMapping("/widget")
    public ResponseEntity<Void> saveWidgetData(
            @RequestBody WidgetDataRequest widgetDataRequest
    ) {
        widgetQueryPort.updateWidgetData(widgetDataRequest.id(), widgetDataRequest.data());
        return ResponseEntity.ok().build();
    }
}
