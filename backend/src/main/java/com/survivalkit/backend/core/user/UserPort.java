package com.survivalkit.backend.core.user;

import com.survivalkit.backend.adapter.postgres.user.ImgWrapper;
import com.survivalkit.backend.adapter.web.profile.ProfileImageResponse;
import com.survivalkit.backend.adapter.web.profile.UserProfile;
import com.survivalkit.backend.shared.Page;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface UserPort {

    void setCourseForUser(String course);
    UserProfile getUserProfile();
    void updateProfilePicture(MultipartFile file);
    ProfileImageResponse getProfilePicture(String userId);
    ImgWrapper getDefaultProfilePicture();
    void updateUsername(String newUsername);
    void updateColor(String newColor);
    Page<UserProfile> getUsers(Integer pageSize, String continuation);
    void promote(String userId, RoleLevel role);
}
