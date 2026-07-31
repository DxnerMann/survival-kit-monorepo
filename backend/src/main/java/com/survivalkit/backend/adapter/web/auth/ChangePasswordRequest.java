package com.survivalkit.backend.adapter.web.auth;

public record ChangePasswordRequest(
        String oldPassword,
        String newPassword
) {
}
