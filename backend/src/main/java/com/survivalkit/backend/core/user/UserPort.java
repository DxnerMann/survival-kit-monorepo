package com.survivalkit.backend.core.user;

import com.survivalkit.backend.adapter.web.profile.UserProfile;

public interface UserPort {

    void setCourseForUser(String course);
    UserProfile getUserProfile();
}
