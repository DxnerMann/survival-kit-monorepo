package com.survivalkit.backend.adapter.web.memewall;

import com.survivalkit.backend.adapter.postgres.memewall.Meme;
import com.survivalkit.backend.core.meme.MemePort;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Meme-Wall")
@RestController
@RequestMapping("v1/memes")
public class MemeWallController {

    private final MemePort memePort;

    public MemeWallController(MemePort memePort) {
        this.memePort = memePort;
    }

    @Role(RoleLevel.USER)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> postMeme(
            @RequestParam MultipartFile file,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description
    ) {
        memePort.postMeme(file, title, description);
        return ResponseEntity.ok().build();
    }

    @Role(RoleLevel.USER)
    @GetMapping
    public ResponseEntity<Page<Meme>> getMemes(
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String continuation
    ) {
        return ResponseEntity.ok(memePort.getMemes(pageSize, continuation));
    }

    @Role(RoleLevel.ADMIN)
    @GetMapping("admin")
    public ResponseEntity<Page<Meme>> getMemesForAdmin(
            @RequestParam(required = false) String course,
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) String continuation
    ) {
        return ResponseEntity.ok(memePort.getMemesForAdmin(course, pageSize, continuation));
    }

    @Role(RoleLevel.USER)
    @GetMapping("{id}")
    public ResponseEntity<Meme> getMeme(
            @PathVariable String id
    ) {
        return ResponseEntity.ok(memePort.getMeme(id));
    }

    @Role(RoleLevel.ADMIN)
    @DeleteMapping("{id}")
    public ResponseEntity<Void> deleteMeme(
            @PathVariable String id
    ) {
        memePort.deleteMeme(id);
        return ResponseEntity.ok().build();
    }
}
