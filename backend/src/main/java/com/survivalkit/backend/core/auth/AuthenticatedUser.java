package com.survivalkit.backend.core.auth;

import com.survivalkit.backend.shared.RoleLevel;

public record AuthenticatedUser(
        String userId,
        RoleLevel role,
        String email
) {}