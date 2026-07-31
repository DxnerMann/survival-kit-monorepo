package com.survivalkit.backend.adapter.web.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.survivalkit.backend.shared.RoleLevel;

public record LoginResponse(
        @JsonIgnore String token,
        String username,
        String firstName,
        String lastname,
        RoleLevel role
) {
}
