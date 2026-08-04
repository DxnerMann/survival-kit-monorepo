package com.survivalkit.backend.adapter.web.presentationgame;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoomListItem;
import com.survivalkit.backend.core.presentationgame.PresentationGamePort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "PresentationGame")
@RestController
@RequestMapping("v1/presentation-game/rooms")
public class PresentationGameController {

    private final PresentationGamePort presentationGamePort;

    public PresentationGameController(PresentationGamePort presentationGamePort) {
        this.presentationGamePort = presentationGamePort;
    }

    @Role(RoleLevel.USER)
    @PostMapping
    public ResponseEntity<PresentationGameRoomCreatedResponse> createRoom(
            @RequestBody CreatePresentationGameRoomRequest request
    ) {
        return ResponseEntity.ok(presentationGamePort.createRoom(request));
    }

    @Role(RoleLevel.USER)
    @GetMapping("/public")
    public ResponseEntity<List<PresentationGameRoomListItem>> getPublicRooms() {
        return ResponseEntity.ok(presentationGamePort.getPublicRooms());
    }

    @Role(RoleLevel.USER)
    @GetMapping("/finished")
    public ResponseEntity<List<PresentationGameFinishedResponse>> getFinishedGames() {
        return ResponseEntity.ok(presentationGamePort.getFinishedGames());
    }

    @Role(RoleLevel.USER)
    @GetMapping("/code/{code}")
    public ResponseEntity<PresentationGameRoomDetailResponse> getRoomByCode(
            @PathVariable String code,
            @RequestParam(defaultValue = "true") boolean autoJoin
    ) {
        return ResponseEntity.ok(presentationGamePort.getRoomByCode(code, autoJoin));
    }

    @Role(RoleLevel.USER)
    @PostMapping("/{roomId}/join")
    public ResponseEntity<PresentationGameRoomJoinedResponse> joinRoomById(
            @PathVariable String roomId
    ) {
        return ResponseEntity.ok(presentationGamePort.joinRoomById(roomId));
    }

    @Role(RoleLevel.USER)
    @PostMapping("/join")
    public ResponseEntity<PresentationGameRoomJoinedResponse> joinRoomByCode(
            @RequestBody JoinPresentationGameRoomRequest request
    ) {
        return ResponseEntity.ok(presentationGamePort.joinRoomByCode(request.code()));
    }

    @Role(RoleLevel.USER)
    @PostMapping("/code/{code}/start")
    public ResponseEntity<PresentationGameStateResponse> startRoom(@PathVariable String code) {
        return ResponseEntity.ok(presentationGamePort.startRoom(code));
    }

    @Role(RoleLevel.USER)
    @PostMapping("/code/{code}/finish")
    public ResponseEntity<Void> finishRoom(@PathVariable String code) {
        presentationGamePort.finishRoom(code);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @GetMapping("/code/{code}/state")
    public ResponseEntity<PresentationGameStateResponse> getGameState(@PathVariable String code) {
        return ResponseEntity.ok(presentationGamePort.getGameState(code));
    }

    @Role(RoleLevel.USER)
    @PostMapping("/code/{code}/skip")
    public ResponseEntity<PresentationGameActionResponse> skipWord(@PathVariable String code) {
        return ResponseEntity.ok(presentationGamePort.skipWord(code));
    }

    @Role(RoleLevel.USER)
    @PostMapping("/code/{code}/approve")
    public ResponseEntity<PresentationGameActionResponse> approveWord(@PathVariable String code) {
        return ResponseEntity.ok(presentationGamePort.approveWord(code));
    }
}
