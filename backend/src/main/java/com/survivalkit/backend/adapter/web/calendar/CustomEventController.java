package com.survivalkit.backend.adapter.web.calendar;

import com.survivalkit.backend.core.calendar.CreateCustomEventCommand;
import com.survivalkit.backend.core.calendar.CustomEvent;
import com.survivalkit.backend.core.calendar.CustomEventPort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Custom events")
@RestController
@RequestMapping("v1/custom-events")
public class CustomEventController {

    private final CustomEventPort customEventPort;

    public CustomEventController(CustomEventPort customEventPort) {
        this.customEventPort = customEventPort;
    }

    @Role(RoleLevel.USER)
    @GetMapping
    public ResponseEntity<List<CustomEvent>> listMine() {
        return ResponseEntity.ok(customEventPort.listMine());
    }

    @Role(RoleLevel.USER)
    @PostMapping
    public ResponseEntity<CustomEvent> create(@RequestBody CreateCustomEventCommand command) {
        return ResponseEntity.ok(customEventPort.create(command));
    }

    @Role(RoleLevel.USER)
    @PutMapping("{id}")
    public ResponseEntity<CustomEvent> update(@PathVariable String id, @RequestBody CreateCustomEventCommand command) {
        return ResponseEntity.ok(customEventPort.update(id, command));
    }

    @Role(RoleLevel.USER)
    @DeleteMapping("{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        customEventPort.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Role(RoleLevel.USER)
    @PostMapping("{id}/response")
    public ResponseEntity<Void> respond(@PathVariable String id, @RequestBody CustomEventResponseRequest request) {
        customEventPort.respond(id, request.accept());
        return ResponseEntity.noContent().build();
    }
}
