package com.survivalkit.backend.adapter.web.caffeine;

import com.survivalkit.backend.adapter.postgres.caffeine.CaffeineEntry;
import com.survivalkit.backend.core.caffeine.CaffeinePort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Caffeine")
@RestController
@RequestMapping("v1/caffeine")
public class CaffeineController {

    private final CaffeinePort caffeinePort;

    public CaffeineController(CaffeinePort caffeinePort) {
        this.caffeinePort = caffeinePort;
    }

    @Role(RoleLevel.USER)
    @PostMapping
    public ResponseEntity<CaffeineEntry> add(@RequestBody CaffeineAddRequest request) {
        return ResponseEntity.ok(caffeinePort.add(request));
    }

    @Role(RoleLevel.USER)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        caffeinePort.delete(id);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @GetMapping("/today")
    public ResponseEntity<List<CaffeineEntry>> getToday() {
        return ResponseEntity.ok(caffeinePort.getToday());
    }

    @Role(RoleLevel.USER)
    @GetMapping("/user")
    public ResponseEntity<List<CaffeineEntry>> getUserEntries() {
        return ResponseEntity.ok(caffeinePort.getLast7DaysForUser());
    }

    @Role(RoleLevel.USER)
    @GetMapping("/course")
    public ResponseEntity<List<CaffeineEntry>> getCourseEntries() {
        return ResponseEntity.ok(caffeinePort.getLast7DaysForCourse());
    }

    @Role(RoleLevel.GUEST)
    @GetMapping("/global")
    public ResponseEntity<List<CaffeineEntry>> getGlobalEntries() {
        return ResponseEntity.ok(caffeinePort.getLast7DaysGlobal());
    }

    @Role(RoleLevel.USER)
    @GetMapping("/average/user")
    public ResponseEntity<Double> getUserAverage() {
        return ResponseEntity.ok(caffeinePort.getAverageForUser());
    }

    @Role(RoleLevel.USER)
    @GetMapping("/average/course")
    public ResponseEntity<Double> getCourseAverage() {
        return ResponseEntity.ok(caffeinePort.getAverageForCourse());
    }

    @Role(RoleLevel.GUEST)
    @GetMapping("/average/global")
    public ResponseEntity<Double> getGlobalAverage() {
        return ResponseEntity.ok(caffeinePort.getAverageGlobal());
    }
}
