package com.survivalkit.backend.adapter.web.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank @Valid @Email String email,
        @NotBlank String password
) {
}
