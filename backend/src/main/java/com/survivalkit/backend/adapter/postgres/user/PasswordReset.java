package com.survivalkit.backend.adapter.postgres.user;

import java.time.Instant;

public record PasswordReset(String codeHash, Instant expiresAt) {
}
