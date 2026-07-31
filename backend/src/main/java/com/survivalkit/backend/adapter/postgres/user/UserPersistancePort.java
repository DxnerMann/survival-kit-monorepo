package com.survivalkit.backend.adapter.postgres.user;

import com.survivalkit.backend.adapter.web.profile.UserProfile;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.RoleLevel;

import java.util.Optional;

public interface UserPersistancePort {

    void save(UserModel user);
    Optional<UserModel> getById(String id);
    Optional<UserModel> findByEmailOrUsername(String email, String username);
    Optional<UserModel> findByVerificationToken(String verificationToken);
    void setVerified(String userId, boolean verified);
    void setUserCourse(String userId, String course);
    Optional<UserProfile> getUserProfile(String userId);
    void updateProfilePicture(ImgWrapper wrapper, String userId);
    Optional<ImgWrapper> getProfilePicture(String userId);
    void updateProfileColor(String userId, String color);
    void updatePassword(String userId, String newPassword);
    void deleteUser(String userId);
    boolean isLastAdmin(String userId);
    void changeEmail(String userId, String newEmail, String newToken);
    void updateVerificationToken(String userId, String verificationToken);
    Page<UserProfile> getUsers(int pageSize, String continuation);
    void setRole(String userId, RoleLevel role);
}
