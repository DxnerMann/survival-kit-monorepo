package com.survivalkit.backend.adapter.web.dashboard;

import com.survivalkit.backend.adapter.postgres.widget.Widget;
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

    @GetMapping
    public ResponseEntity<List<Widget>> getDashboardLayout() {
        // TODO: Return all widgets for the user
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<Void> saveDashboardLayout(
            @RequestBody List<Widget> widgets
    ) {
        // TODO: Delete all stored user Widgets, create new ids and save them
        return ResponseEntity.ok().build();
    }

    @PostMapping("/widget")
    public ResponseEntity<Void> saveWidgetData(
            @RequestBody WidgetDataRequest widgetDataRequest
    ) {
        //  TODO: get widgets by id and userId and update Data
        return ResponseEntity.ok().build();
    }
}
