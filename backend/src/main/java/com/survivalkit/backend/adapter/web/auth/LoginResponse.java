package com.survivalkit.backend.adapter.web.auth;

public record LoginResponse(
        String token,
        String username,
        String firstName,
        String lastname
) {
}
