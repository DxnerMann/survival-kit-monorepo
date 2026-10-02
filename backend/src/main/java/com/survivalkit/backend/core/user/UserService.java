package com.survivalkit.backend.core.user;

import com.survivalkit.backend.adapter.postgres.user.ImgWrapper;
import com.survivalkit.backend.adapter.postgres.user.UserModel;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.adapter.web.profile.ProfileImageResponse;
import com.survivalkit.backend.adapter.web.profile.UserProfile;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.security.SecurityLog;
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

import static com.survivalkit.backend.context.SecurityContext.requireVerification;

@Service
public class UserService implements UserPort {

    private static final int MAX_PROFILE_PICTURE_BYTES = 8 * 1024 * 1024;

    private final UserPersistancePort userPersistancePort;
    private final SecurityLog securityLog;

    public UserService(UserPersistancePort userPersistancePort, SecurityLog securityLog) {
        this.userPersistancePort = userPersistancePort;
        this.securityLog = securityLog;
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
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(ErrorCode.FAILED_TO_READ_IMAGE_BYTES.getCode());
        }
        if (file.getSize() > MAX_PROFILE_PICTURE_BYTES) {
            throw new IllegalArgumentException(ErrorCode.PROFILE_PICTURE_TOO_LARGE.getCode());
        }

        final byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException(ErrorCode.FAILED_TO_READ_IMAGE_BYTES.getCode());
        }

        var type = detectProfileImageType(file.getContentType(), file.getOriginalFilename(), bytes);
        if (type == null) {
            throw new IllegalArgumentException(ErrorCode.UNSUPPORTED_CONTENT_TYPE_PROFILE_PICTURE.getCode());
        }

        userPersistancePort.updateProfilePicture(new ImgWrapper(bytes, type), user.userId());
        securityLog.logInfo(
                ErrorCode.ErrorCategory.USER,
                "Profile picture updated for " + user.username() + " (" + type + ", " + bytes.length + " bytes)"
        );
    }

    private static ImgWrapper.ProfileImgType detectProfileImageType(String contentType, String filename, byte[] bytes) {
        var sniffed = sniffProfileImage(bytes);
        if (sniffed != null) {
            return sniffed;
        }
        var declared = declaredProfileImageType(contentType);
        if (declared != null) {
            return declared;
        }
        return declaredProfileImageType(mimeFromFilename(filename));
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

    private static ImgWrapper.ProfileImgType declaredProfileImageType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return null;
        }
        return switch (contentType.toLowerCase().split(";")[0].trim()) {
            case "image/png", "image/x-png" -> ImgWrapper.ProfileImgType.PNG;
            case "image/jpeg", "image/jpg", "image/pjpeg" -> ImgWrapper.ProfileImgType.JPG;
            case "image/gif", "image/x-gif" -> ImgWrapper.ProfileImgType.GIF;
            default -> null;
        };
    }

    private static String mimeFromFilename(String filename) {
        if (filename == null) {
            return null;
        }
        var lower = filename.toLowerCase();
        if (lower.endsWith(".gif")) {
            return "image/gif";
        }
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
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

        userPersistancePort.setRole(userId, role);
    }
}
