package com.survivalkit.backend.adapter.web.profile;

import com.survivalkit.backend.shared.RoleLevel;

public record UserProfile(
        String firstname,
        String lastname,
        String course,
        RoleLevel role,
        String email,
        String username,
        String color,
        String userId
) {
}
