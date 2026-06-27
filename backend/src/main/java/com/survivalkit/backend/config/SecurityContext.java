package com.survivalkit.backend.config;

import com.survivalkit.backend.core.auth.AuthenticatedUser;

import java.util.Optional;

public final class SecurityContext {

    private static final ThreadLocal<AuthenticatedUser> HOLDER = new ThreadLocal<>();

    private SecurityContext() {}

    public static void set(AuthenticatedUser user) {
        HOLDER.set(user);
    }

    public static Optional<AuthenticatedUser> current() {
        return Optional.ofNullable(HOLDER.get());
    }

    public static void clear() {
        HOLDER.remove();
    }
}