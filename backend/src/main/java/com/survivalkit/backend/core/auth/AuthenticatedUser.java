package com.survivalkit.backend.core.auth;

import com.survivalkit.backend.shared.RoleLevel;

public record AuthenticatedUser(
        String token,
        String userId,
        String username,
        RoleLevel role,
        String email,
        Boolean isVerified
) {}