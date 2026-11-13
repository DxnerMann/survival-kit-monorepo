package com.survivalkit.backend.core.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.adapter.postgres.user.ImgWrapper;
import com.survivalkit.backend.adapter.postgres.user.UserModel;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.adapter.web.profile.ProfileImageResponse;
import com.survivalkit.backend.adapter.web.profile.UserProfile;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.activity.ActivityPort;
import com.survivalkit.backend.core.security.SecurityLog;
import com.survivalkit.backend.core.websocket.WebSocketPort;
import com.survivalkit.backend.shared.WebSocketEnvelope;
import com.survivalkit.backend.shared.WebSocketMessageType;
import com.survivalkit.backend.core.user.exception.CannotDeleteLastAdminException;
import com.survivalkit.backend.core.user.exception.UsernameChangeToSoonException;
import com.survivalkit.backend.core.user.exception.UserNotFoundException;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HexFormat;

import static com.survivalkit.backend.context.SecurityContext.requireVerification;

@Service
public class UserService implements UserPort {

    private static final int MAX_PROFILE_PICTURE_BYTES = 20 * 1024 * 1024;

    private final UserPersistancePort userPersistancePort;
    private final SecurityLog securityLog;
    private final ActivityPort activityPort;
    private final WebSocketPort webSocketPort;
    private final ObjectMapper objectMapper;

    public UserService(
            UserPersistancePort userPersistancePort,
            SecurityLog securityLog,
            ActivityPort activityPort,
            WebSocketPort webSocketPort,
            ObjectMapper objectMapper
    ) {
        this.userPersistancePort = userPersistancePort;
        this.securityLog = securityLog;
        this.activityPort = activityPort;
        this.webSocketPort = webSocketPort;
        this.objectMapper = objectMapper;
    }

    @Override
    public void setCourseForUser(String course) {
        requireVerification();
        var user = SecurityContext.current();
        userPersistancePort.setUserCourse(user.userId(), course);
    }

    @Override
    public UserProfile getUserProfile() {
        var user = SecurityContext.current();
        return userPersistancePort.getUserProfile(user.userId())
                .orElseThrow(() -> new UserNotFoundException(user.userId()));
    }

    @Override
    public void updateProfilePicture(MultipartFile file) {
        requireVerification();
        var user = SecurityContext.current();
        var filename = file == null ? null : file.getOriginalFilename();
        var declared = file == null ? null : file.getContentType();
        if (file == null || file.isEmpty()) {
            rejectProfilePicture(user.username(), filename, declared, null, ErrorCode.FAILED_TO_READ_IMAGE_BYTES);
            return;
        }

        final byte[] raw;
        try {
            raw = file.getBytes();
        } catch (IOException e) {
            rejectProfilePicture(user.username(), filename, declared, null, ErrorCode.FAILED_TO_READ_IMAGE_BYTES);
            return;
        }

        var bytes = stripBom(raw);
        if (bytes.length > MAX_PROFILE_PICTURE_BYTES) {
            rejectProfilePicture(user.username(), filename, declared, bytes, ErrorCode.PROFILE_PICTURE_TOO_LARGE);
            return;
        }

        var type = sniffProfileImage(bytes);
        if (type == null) {
            rejectProfilePicture(user.username(), filename, declared, bytes, ErrorCode.UNSUPPORTED_CONTENT_TYPE_PROFILE_PICTURE);
            return;
        }

        userPersistancePort.updateProfilePicture(new ImgWrapper(bytes, type), user.userId());
        securityLog.logInfo(
                ErrorCode.ErrorCategory.USER,
                "Profile picture updated for " + user.username() + " (" + type + ", " + bytes.length + " bytes, declared=" + declared + ", file=" + filename + ")"
        );
    }

    private void rejectProfilePicture(String username, String filename, String declared, byte[] bytes, ErrorCode code) {
        securityLog.logWarning(
                ErrorCode.ErrorCategory.USER,
                "Profile picture rejected for " + username
                        + ": " + code.getCode()
                        + ", file=" + filename
                        + ", declared=" + declared
                        + ", bytes=" + (bytes == null ? 0 : bytes.length)
                        + ", header=" + headerHex(bytes)
        );
        if (code == ErrorCode.FAILED_TO_READ_IMAGE_BYTES && bytes == null) {
            throw new RuntimeException(code.getCode());
        }
        throw new IllegalArgumentException(code.getCode());
    }

    private static byte[] stripBom(byte[] bytes) {
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xEF
                && (bytes[1] & 0xFF) == 0xBB
                && (bytes[2] & 0xFF) == 0xBF) {
            return Arrays.copyOfRange(bytes, 3, bytes.length);
        }
        return bytes;
    }

    private static String headerHex(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }
        return HexFormat.of().formatHex(bytes, 0, Math.min(bytes.length, 8));
    }

    private static ImgWrapper.ProfileImgType sniffProfileImage(byte[] bytes) {
        if (bytes.length >= 6
                && bytes[0] == 'G'
                && bytes[1] == 'I'
                && bytes[2] == 'F'
                && bytes[3] == '8'
                && (bytes[4] == '7' || bytes[4] == '9')
                && bytes[5] == 'a') {
            return ImgWrapper.ProfileImgType.GIF;
        }
        if (bytes.length >= 8
                && (bytes[0] & 0xFF) == 0x89
                && bytes[1] == 'P'
                && bytes[2] == 'N'
                && bytes[3] == 'G') {
            return ImgWrapper.ProfileImgType.PNG;
        }
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8
                && (bytes[2] & 0xFF) == 0xFF) {
            return ImgWrapper.ProfileImgType.JPG;
        }
        return null;
    }

    @Override
    public ProfileImageResponse getProfilePicture(String userId) {
        var wrapper = userPersistancePort.getProfilePicture(userId);

        if (wrapper.isPresent() && wrapper.get().imgType() != null && wrapper.get().img() != null) {
            var type = switch (wrapper.get().imgType()) {
                case JPG -> MediaType.IMAGE_JPEG;
                case PNG -> MediaType.IMAGE_PNG;
                case GIF -> MediaType.IMAGE_GIF;
                default -> MediaType.IMAGE_PNG;
            };
            return new ProfileImageResponse(
                new ByteArrayResource(wrapper.get().img()),
                type
            );
        } else {
            return new ProfileImageResponse(
                    new ByteArrayResource(getDefaultProfilePicture().img()),
                    MediaType.IMAGE_PNG
            );
        }
    }

    @Override
    public ImgWrapper getDefaultProfilePicture() {
        try {
            return new ImgWrapper(
                    new ClassPathResource("static/default-profile-picture.png").getContentAsByteArray(),
                    ImgWrapper.ProfileImgType.PNG
            );
        } catch (IOException e) {
            throw new RuntimeException(ErrorCode.FAILED_TO_LOAD_DEFAULT_PICTURE.getCode());
        }
    }

    @Override
    public void updateUsername(String newUsername) {
        requireVerification();
        var authUser = SecurityContext.current();
        var user = userPersistancePort.getById(authUser.userId());

        if (user.isEmpty()) {
            throw new UserNotFoundException(ErrorCode.USER_DOES_NOT_EXIST.getCode());
        }
        var oldUser = user.get();
        var lastUpdated = oldUser.lastUpdated();
        var nextAllowed = lastUpdated.plus(30, ChronoUnit.DAYS);

        var daysLeft = ChronoUnit.DAYS.between(Instant.now(), nextAllowed);

        if (daysLeft > 0) {
            throw new UsernameChangeToSoonException(ErrorCode.USERNAME_CHANGE_TO_EARLY.getCode());
        }
        userPersistancePort.save(
            new UserModel(
                oldUser.id(),
                oldUser.firstname(),
                oldUser.lastname(),
                    newUsername,
                oldUser.email(),
                oldUser.password(),
                oldUser.role(),
                oldUser.verificationToken(),
                oldUser.isVerified(),
                oldUser.course(),
                oldUser.color(),
                oldUser.img(),
                oldUser.lastUpdated()
            )
        );
    }

    @Override
    public void updateColor(String newColor) {
        requireVerification();
        var user = SecurityContext.current();

        if (!newColor.matches("^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$")) {
            throw new IllegalArgumentException(ErrorCode.INVALID_COLOR.getCode());
        }
        userPersistancePort.updateProfileColor(user.userId(), newColor);
    }

    @Override
    public void updateAccentColor(String newColor) {
        requireVerification();
        var user = SecurityContext.current();
        if (newColor == null || newColor.isBlank()) {
            userPersistancePort.updateAccentColor(user.userId(), null);
            return;
        }
        if (!newColor.matches("^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$")) {
            throw new IllegalArgumentException(ErrorCode.INVALID_COLOR.getCode());
        }
        userPersistancePort.updateAccentColor(user.userId(), newColor);
    }

    @Override
    public Page<UserProfile> getUsers(Integer pageSize, String continuation) {
        pageSize = pageSize == null ? 20 : pageSize;
        pageSize = pageSize > 50 ? 50 : pageSize;

        return userPersistancePort.getUsers(pageSize, continuation);
    }

    @Override
    public void promote(String userId, RoleLevel role) {
        requireVerification();

        if (role != RoleLevel.USER && role != RoleLevel.ADMIN) {
            throw new IllegalArgumentException(ErrorCode.NOT_REQUIRED_ROLE.getCode());
        }

        if (role == RoleLevel.USER && userPersistancePort.isLastAdmin(userId)) {
            throw new CannotDeleteLastAdminException(ErrorCode.UNABLE_TO_DELETE_LAST_ADMIN.getCode());
        }

        var actor = SecurityContext.current();
        var previous = userPersistancePort.getUserProfile(userId).map(UserProfile::role).orElse(null);
        userPersistancePort.setRole(userId, role);
        if (previous == null || previous == role || userId.equals(actor.userId())) {
            return;
        }

        var activity = activityPort.recordRoleChanged(userId, role.name(), actor.username());
        webSocketPort.sendToUser(
                userId,
                WebSocketEnvelope.of(
                        WebSocketMessageType.ACTIVITY,
                        objectMapper.createObjectNode()
                                .put("kind", "ROLE_CHANGED")
                                .put("id", activity.id())
                )
        );
    }
}
