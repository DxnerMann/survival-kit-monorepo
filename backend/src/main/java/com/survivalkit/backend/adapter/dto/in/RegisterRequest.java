package com.survivalkit.backend.adapter.dto.in;

public record RegisterRequest(
        String username,
        String email,
        String password
) {
}
