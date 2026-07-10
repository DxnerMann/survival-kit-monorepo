package com.survivalkit.backend.core.user;

import com.survivalkit.backend.adapter.postgres.user.ImgWrapper;
import com.survivalkit.backend.adapter.postgres.user.UserModel;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.profile.ProfileImageResponse;
import com.survivalkit.backend.adapter.web.profile.UserProfile;
import com.survivalkit.backend.config.SecurityContext;
import com.survivalkit.backend.core.user.exception.UsernameChangeToSoonException;
import com.survivalkit.backend.core.user.exception.UserNotFoundException;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class UserService implements UserPort {

    private final UserPersistancePort userPersistancePort;

    public UserService(UserPersistancePort userPersistancePort) {
        this.userPersistancePort = userPersistancePort;
    }

    @Override
    public void setCourseForUser(String course) {
            var user = SecurityContext.current();

            if (user.isEmpty()) {
                throw new IllegalStateException(
                        "No authenticated user in context. " +
                                "Ensure this is called within a secured request.");
            }

            userPersistancePort.setUserCourse(user.get().userId(), course);
            return;
    }

    @Override
    public UserProfile getUserProfile() {
        var user = SecurityContext.current();
        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }
        return userPersistancePort.getUserProfile(user.get().userId())
                .orElseThrow(() -> new UserNotFoundException(user.get().userId()));
    }

    @Override
    public void updateProfilePicture(MultipartFile file) {
        var user = SecurityContext.current();
        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }

        var contentType = file.getContentType();

        if (contentType == null) {
            throw new IllegalArgumentException("Missing content type");
        }
        var normalized = contentType.toLowerCase().split(";")[0].trim();
        try {
            var type = switch (normalized) {
                case "image/png" -> ImgWrapper.ProfileImgType.PNG;
                case "image/jpeg" -> ImgWrapper.ProfileImgType.JPG;
                case "image/gif" -> ImgWrapper.ProfileImgType.GIF;
                default -> throw new IllegalArgumentException("Unsupported content type: " + contentType);
            };
            var wrapper = new ImgWrapper(
                    file.getBytes(),
                    type
            );
            userPersistancePort.updateProfilePicture(wrapper, user.get().userId());
        } catch (IOException e) {
            throw new RuntimeException("Failed to read image bytes", e);
        }
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
            throw new RuntimeException("Failed to read default profile picture", e);
        }
    }

    @Override
    public void updateUsername(String newUsername) {
        var authUser = SecurityContext.current();

        if (authUser.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }

        var user = userPersistancePort.getById(authUser.get().userId());

        if (user.isEmpty()) {
            throw new UserNotFoundException(authUser.get().userId());
        }
        var oldUser = user.get();
        var lastUpdated = oldUser.lastUpdated();
        var nextAllowed = lastUpdated.plus(30, ChronoUnit.DAYS);

        var daysLeft = ChronoUnit.DAYS.between(Instant.now(), nextAllowed);

        if (daysLeft > 0) {
            throw new UsernameChangeToSoonException(daysLeft);
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
        var user = SecurityContext.current();

        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }
        if (!newColor.matches("^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$")) {
            throw new IllegalArgumentException("Invalid hex color: " + newColor);
        }
        userPersistancePort.updateProfileColor(user.get().userId(), newColor);
    }
}
