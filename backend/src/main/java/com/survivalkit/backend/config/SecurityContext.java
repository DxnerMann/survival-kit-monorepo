package com.survivalkit.backend.config;

import com.survivalkit.backend.core.auth.AuthenticatedUser;

public final class SecurityContext {

    private static final ThreadLocal<AuthenticatedUser> HOLDER = new ThreadLocal<>();

    private SecurityContext() {}

    public static void set(AuthenticatedUser user) {
        HOLDER.set(user);
    }

    public static AuthenticatedUser current() {
        var user = HOLDER.get();
        if (user == null) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }
        return user;
    }

    public static void clear() {
        HOLDER.remove();
    }
}