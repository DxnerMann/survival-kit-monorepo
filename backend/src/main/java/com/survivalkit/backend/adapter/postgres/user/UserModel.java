package com.survivalkit.backend.adapter.postgres.user;

import com.survivalkit.backend.shared.RoleLevel;

import java.time.Instant;

public record UserModel(
        String id,
        String firstname,
        String lastname,
        String username,
        String email,
        String password,
        RoleLevel role,
        String verificationToken,
        Boolean isVerified
) {
}
