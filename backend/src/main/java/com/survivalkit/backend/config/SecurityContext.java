package com.survivalkit.backend.config;

import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.core.user.AuthenticatedUser;

import java.util.Optional;

public final class SecurityContext {

    private static final ThreadLocal<AuthenticatedUser> HOLDER = new ThreadLocal<>();

    private SecurityContext() {}

    public static void set(AuthenticatedUser user) {
        HOLDER.set(user);
    }

    public static AuthenticatedUser current() {
        var user = Optional.ofNullable(HOLDER.get());

        if (user.isEmpty()) {
            throw new RuntimeException(ErrorCode.NO_AUTHENTICATED_USER_IN_CONTEXT.getCode());
        }
        return user.get();
    }

    public static void clear() {
        HOLDER.remove();
    }
}