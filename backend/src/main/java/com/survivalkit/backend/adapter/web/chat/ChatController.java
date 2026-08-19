package com.survivalkit.backend.adapter.web.chat;

import com.survivalkit.backend.adapter.postgres.chat.ChatAttachmentMeta;
import com.survivalkit.backend.adapter.postgres.chat.ChatMessage;
import com.survivalkit.backend.core.chat.ChatPort;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Tag(name = "Daily Chat")
@RestController
@RequestMapping("v1/chat")
public class ChatController {

    private final ChatPort chatPort;

    public ChatController(ChatPort chatPort) {
        this.chatPort = chatPort;
    }

    @Role(RoleLevel.USER)
    @GetMapping("messages")
    public ResponseEntity<List<ChatMessage>> getMessages() {
        return ResponseEntity.ok(chatPort.getTodaysMessages());
    }

    @Role(RoleLevel.USER)
    @PostMapping(path = "attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChatAttachmentMeta> uploadAttachment(
            @RequestParam MultipartFile file,
            @RequestParam(required = false) Integer durationMs
    ) {
        return ResponseEntity.ok(chatPort.uploadAttachment(file, durationMs));
    }

    @Role(RoleLevel.USER)
    @GetMapping("attachments/{id}")
    public ResponseEntity<ByteArrayResource> getAttachment(@PathVariable String id) {
        var file = chatPort.getAttachment(id);
        var resource = new ByteArrayResource(file.data());
        var inline = file.contentType().startsWith("image/") || file.contentType().startsWith("video/");
        var disposition = ContentDisposition.builder(inline ? "inline" : "attachment")
                .filename(file.filename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.data().length)
                .body(resource);
    }
}
