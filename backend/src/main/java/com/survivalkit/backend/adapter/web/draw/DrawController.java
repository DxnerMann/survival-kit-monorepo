package com.survivalkit.backend.adapter.web.draw;

import com.survivalkit.backend.core.draw.DrawBoardService;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Draw")
@RestController
@RequestMapping("v1/draw")
public class DrawController {

    private final DrawBoardService drawBoardService;

    public DrawController(DrawBoardService drawBoardService) {
        this.drawBoardService = drawBoardService;
    }

    @Role(RoleLevel.USER)
    @GetMapping("users")
    public ResponseEntity<List<String>> users(@RequestParam(defaultValue = "") String q) {
        return ResponseEntity.ok(drawBoardService.search(q));
    }

    @Role(RoleLevel.USER)
    @GetMapping("board")
    public ResponseEntity<DrawBoardResponse> board(@RequestParam(defaultValue = "") String partner) {
        return ResponseEntity.ok(drawBoardService.view(partner));
    }

    @Role(RoleLevel.USER)
    @PostMapping("open")
    public ResponseEntity<DrawBoardResponse> open(@RequestBody DrawPartnerRequest request) {
        return ResponseEntity.ok(drawBoardService.announce(request.partnerUsername()));
    }

    @Role(RoleLevel.USER)
    @PostMapping("unpair")
    public ResponseEntity<Void> unpair(@RequestBody DrawPartnerRequest request) {
        drawBoardService.unpair(request.partnerUsername());
        return ResponseEntity.noContent().build();
    }

    @Role(RoleLevel.USER)
    @PostMapping("reset")
    public ResponseEntity<DrawBoardResponse> reset(@RequestBody DrawResetRequest request) {
        return ResponseEntity.ok(drawBoardService.vote(request.partnerUsername(), request.want()));
    }

    @Role(RoleLevel.USER)
    @PostMapping("strokes")
    public ResponseEntity<Void> stroke(@RequestBody DrawStrokeRequest request) {
        var saved = drawBoardService.commitStroke(request.partnerUsername(), request.stroke());
        return saved ? ResponseEntity.noContent().build() : ResponseEntity.status(409).build();
    }

    @Role(RoleLevel.USER)
    @PostMapping("strokes/undo")
    public ResponseEntity<DrawBoardResponse.Stroke> undo(@RequestBody DrawPartnerRequest request) {
        return drawBoardService.undoLast(request.partnerUsername())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Role(RoleLevel.USER)
    @PostMapping("strokes/remove")
    public ResponseEntity<Void> remove(@RequestBody DrawStrokeRemoveRequest request) {
        var removed = drawBoardService.removeStroke(request.partnerUsername(), request.strokeId());
        return removed ? ResponseEntity.noContent().build() : ResponseEntity.status(409).build();
    }
}
