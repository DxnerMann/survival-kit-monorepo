package com.survivalkit.backend.core.meme;

import com.survivalkit.backend.adapter.postgres.memewall.Meme;
import com.survivalkit.backend.adapter.postgres.memewall.MemePersistancePort;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.security.RateLimitService;
import com.survivalkit.backend.core.user.exception.UserNotFoundException;
import com.survivalkit.backend.shared.Page;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;

import static com.survivalkit.backend.context.SecurityContext.requireVerification;

@Service
public class MemeService implements MemePort {

    private final MemePersistancePort memePersistancePort;
    private final UserPersistancePort userPersistancePort;
    private final RateLimitService rateLimitService;

    public MemeService(MemePersistancePort memePersistancePort, UserPersistancePort userPersistancePort, RateLimitService rateLimitService) {
        this.memePersistancePort = memePersistancePort;
        this.userPersistancePort = userPersistancePort;
        this.rateLimitService = rateLimitService;
    }

    @Override
    public void postMeme(MultipartFile file, String title, String description) {
        requireVerification();

        var user = SecurityContext.current();
        rateLimitService.check("meme-upload", user.userId(), 1, Duration.ofMinutes(5), ErrorCode.MEME_UPLOAD_RATE_LIMIT_EXCEEDED);

        var course = currentUserCourse();
        var contentType = normalizedContentType(file);
        var now = Instant.now();

        try {
            memePersistancePort.saveMeme(new Meme(
                    NanoId.generate(25),
                    title,
                    description,
                    file.getBytes(),
                    contentType,
                    course,
                    user.userId(),
                    now,
                    now
            ));
        } catch (IOException e) {
            throw new RuntimeException(ErrorCode.FAILED_TO_READ_MEME_BYTES.getCode());
        }
    }

    @Override
    public Page<Meme> getMemes(Integer pageSize, String continuation) {
        pageSize = pageSize == null ? 20 : pageSize;
        pageSize = pageSize > 50 ? 50 : pageSize;

        var course = currentUserCourse();
        return memePersistancePort.getMemesByCourse(course, pageSize, continuation);
    }

    @Override
    public Page<Meme> getMemesForAdmin(String course, Integer pageSize, String continuation) {
        pageSize = pageSize == null ? 20 : pageSize;
        pageSize = pageSize > 50 ? 50 : pageSize;

        var courseFilter = course == null || course.isBlank() ? null : course.trim();
        return memePersistancePort.getMemesForAdmin(courseFilter, pageSize, continuation);
    }

    @Override
    public Meme getMeme(String id) {
        var course = currentUserCourse();
        return memePersistancePort.getMemeByIdAndCourse(id, course)
                .orElseThrow(() -> new IllegalArgumentException(ErrorCode.MEME_NOT_FOUND.getCode()));
    }

    @Override
    public void deleteMeme(String id) {
        requireVerification();
        memePersistancePort.deleteMeme(id);
    }

    private String currentUserCourse() {
        var user = SecurityContext.current();
        var profile = userPersistancePort.getUserProfile(user.userId())
                .orElseThrow(() -> new UserNotFoundException(ErrorCode.USER_DOES_NOT_EXIST.getCode()));

        if (profile.course() == null || profile.course().isBlank()) {
            throw new IllegalArgumentException(ErrorCode.MEME_COURSE_REQUIRED.getCode());
        }

        return profile.course();
    }

    private static String normalizedContentType(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(ErrorCode.MEME_FILE_EMPTY.getCode());
        }

        var contentType = file.getContentType();

        if (contentType == null) {
            throw new IllegalArgumentException(ErrorCode.MISSING_CONTENT_TYPE_MEME.getCode());
        }

        var normalized = contentType.toLowerCase().split(";")[0].trim();
        return switch (normalized) {
            case "image/png", "image/jpeg", "image/gif" -> normalized;
            case "image/jpg" -> "image/jpeg";
            default -> throw new IllegalArgumentException(ErrorCode.UNSUPPORTED_CONTENT_TYPE_MEME.getCode());
        };
    }
}
