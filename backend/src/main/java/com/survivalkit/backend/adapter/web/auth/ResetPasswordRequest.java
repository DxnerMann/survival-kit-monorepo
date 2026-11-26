package com.survivalkit.backend.adapter.web.auth;

public record ResetPasswordRequest(String email, String code, String newPassword) {
}
