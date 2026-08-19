package com.survivalkit.backend.core.chat;

import com.survivalkit.backend.adapter.postgres.chat.ChatAttachmentFile;
import com.survivalkit.backend.adapter.postgres.chat.ChatAttachmentMeta;
import com.survivalkit.backend.adapter.postgres.chat.ChatMessage;
import com.survivalkit.backend.adapter.postgres.chat.ChatPersistancePort;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.security.RateLimitService;
import com.survivalkit.backend.core.user.exception.UserNotFoundException;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;

import static com.survivalkit.backend.context.SecurityContext.requireVerification;

@Service
public class ChatService implements ChatPort {

    static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    static final int MAX_TEXT_LENGTH = 4000;
    static final int MAX_ATTACHMENTS = 5;
    static final int MAX_VIDEO_DURATION_MS = 120_000;
    static final int MAX_IMAGE_BYTES = 8 * 1024 * 1024;
    static final int MAX_VIDEO_BYTES = 50 * 1024 * 1024;
    static final int MAX_FILE_BYTES = 15 * 1024 * 1024;

    private final ChatPersistancePort chatPersistancePort;
    private final UserPersistancePort userPersistancePort;
    private final RateLimitService rateLimitService;

    public ChatService(
            ChatPersistancePort chatPersistancePort,
            UserPersistancePort userPersistancePort,
            RateLimitService rateLimitService
    ) {
        this.chatPersistancePort = chatPersistancePort;
        this.userPersistancePort = userPersistancePort;
        this.rateLimitService = rateLimitService;
    }

    @Override
    public List<ChatMessage> getTodaysMessages() {
        var course = currentUserCourse();
        return chatPersistancePort.findMessagesByCourseSince(course, startOfTodayBerlin());
    }

    @Override
    public ChatAttachmentMeta uploadAttachment(MultipartFile file, Integer durationMs) {
        requireVerification();
        var user = SecurityContext.current();
        rateLimitService.check("chat-upload", user.userId(), 10, Duration.ofMinutes(1));

        var course = currentUserCourse();
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(ErrorCode.CHAT_ATTACHMENT_EMPTY.getCode());
        }

        var contentType = normalizedContentType(file.getContentType());
        var kind = kindFor(contentType);
        var size = file.getSize();
        if (size > maxBytesFor(kind)) {
            throw new IllegalArgumentException(ErrorCode.CHAT_FILE_TOO_LARGE.getCode());
        }

        Integer storedDuration = null;
        if ("VIDEO".equals(kind)) {
            if (durationMs == null || durationMs <= 0 || durationMs > MAX_VIDEO_DURATION_MS) {
                throw new IllegalArgumentException(ErrorCode.CHAT_VIDEO_TOO_LONG.getCode());
            }
            storedDuration = durationMs;
        }

        var filename = safeFilename(file.getOriginalFilename());
        var meta = new ChatAttachmentMeta(
                NanoId.generate(25),
                null,
                filename,
                contentType,
                (int) size,
                storedDuration,
                kind
        );

        try {
            chatPersistancePort.saveAttachment(meta, file.getBytes(), course, user.userId(), Instant.now());
        } catch (IOException e) {
            throw new RuntimeException(ErrorCode.CHAT_ATTACHMENT_EMPTY.getCode());
        }

        return meta;
    }

    @Override
    public ChatAttachmentFile getAttachment(String id) {
        var course = currentUserCourse();
        return chatPersistancePort.findAttachment(id, course)
                .orElseThrow(() -> new IllegalArgumentException(ErrorCode.CHAT_ATTACHMENT_NOT_FOUND.getCode()));
    }

    @Transactional
    @Override
    public ChatMessage postMessage(
            String userId,
            String username,
            String course,
            String text,
            List<String> attachmentIds,
            String clientId
    ) {
        rateLimitService.check("chat-message", userId, 30, Duration.ofMinutes(1));

        var body = text == null ? "" : text.strip();
        var ids = attachmentIds == null ? List.<String>of() : attachmentIds.stream().distinct().toList();

        if (body.length() > MAX_TEXT_LENGTH) {
            throw new IllegalArgumentException(ErrorCode.CHAT_MESSAGE_TOO_LONG.getCode());
        }
        if (ids.size() > MAX_ATTACHMENTS) {
            throw new IllegalArgumentException(ErrorCode.CHAT_TOO_MANY_ATTACHMENTS.getCode());
        }
        if (body.isEmpty() && ids.isEmpty()) {
            throw new IllegalArgumentException(ErrorCode.CHAT_MESSAGE_EMPTY.getCode());
        }
        if (!chatPersistancePort.attachmentsBelongToUser(ids, userId, course)) {
            throw new IllegalArgumentException(ErrorCode.CHAT_ATTACHMENT_NOT_FOUND.getCode());
        }

        var now = Instant.now();
        var message = new ChatMessage(
                NanoId.generate(25),
                course,
                userId,
                username,
                body.isEmpty() ? null : body,
                now,
                List.of(),
                null
        );
        chatPersistancePort.saveMessage(message);
        chatPersistancePort.linkAttachments(message.id(), userId, course, ids);
        var attachments = chatPersistancePort.findAttachmentsByMessageIds(List.of(message.id()));
        return new ChatMessage(
                message.id(),
                message.course(),
                message.authorUserId(),
                message.authorUsername(),
                message.text(),
                message.createdAt(),
                attachments,
                sanitizedClientId(clientId)
        );
    }

    @Override
    public void deleteAll() {
        chatPersistancePort.deleteAll();
    }

    private String currentUserCourse() {
        var user = SecurityContext.current();
        var profile = userPersistancePort.getUserProfile(user.userId())
                .orElseThrow(() -> new UserNotFoundException(ErrorCode.USER_DOES_NOT_EXIST.getCode()));

        if (profile.course() == null || profile.course().isBlank()) {
            throw new IllegalArgumentException(ErrorCode.CHAT_COURSE_REQUIRED.getCode());
        }
        return profile.course();
    }

    static Instant startOfTodayBerlin() {
        return LocalDate.now(BERLIN).atStartOfDay(BERLIN).toInstant();
    }

    private static String normalizedContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            throw new IllegalArgumentException(ErrorCode.CHAT_UNSUPPORTED_CONTENT_TYPE.getCode());
        }
        var normalized = contentType.toLowerCase(Locale.ROOT).split(";")[0].trim();
        return switch (normalized) {
            case "image/jpg" -> "image/jpeg";
            case "image/png", "image/jpeg", "image/gif", "image/webp",
                 "video/mp4", "video/webm", "video/quicktime",
                 "application/pdf", "application/zip", "application/x-zip-compressed",
                 "text/plain", "text/csv",
                 "application/msword",
                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                 "application/vnd.ms-powerpoint",
                 "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                 "application/vnd.ms-excel",
                 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> normalized;
            default -> throw new IllegalArgumentException(ErrorCode.CHAT_UNSUPPORTED_CONTENT_TYPE.getCode());
        };
    }

    private static String kindFor(String contentType) {
        if ("image/gif".equals(contentType)) {
            return "GIF";
        }
        if (contentType.startsWith("image/")) {
            return "IMAGE";
        }
        if (contentType.startsWith("video/")) {
            return "VIDEO";
        }
        return "FILE";
    }

    private static int maxBytesFor(String kind) {
        return switch (kind) {
            case "IMAGE", "GIF" -> MAX_IMAGE_BYTES;
            case "VIDEO" -> MAX_VIDEO_BYTES;
            default -> MAX_FILE_BYTES;
        };
    }

    private static String sanitizedClientId(String clientId) {
        if (clientId == null || clientId.isBlank() || clientId.length() > 80) {
            return null;
        }
        for (int i = 0; i < clientId.length(); i++) {
            char c = clientId.charAt(i);
            if (c != '-' && c != '_' && !Character.isLetterOrDigit(c)) {
                return null;
            }
        }
        return clientId;
    }

    private static String safeFilename(String original) {
        if (original == null || original.isBlank()) {
            return "datei";
        }
        var name = original.replace("\\", "/");
        name = name.substring(name.lastIndexOf('/') + 1).trim();
        return name.isEmpty() ? "datei" : name.substring(0, Math.min(name.length(), 180));
    }
}
