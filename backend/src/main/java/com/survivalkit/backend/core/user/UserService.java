package com.survivalkit.backend.core.user;

import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.profile.UserProfile;
import com.survivalkit.backend.config.SecurityContext;
import com.survivalkit.backend.core.user.exception.UserNotFoundException;
import org.springframework.stereotype.Service;

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
}
