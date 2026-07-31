package com.survivalkit.backend.context;

import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.core.user.AuthenticatedUser;

import java.util.Optional;

public final class SecurityContext {

    private static final ThreadLocal<AuthenticatedUser> HOLDER = new ThreadLocal<>();

    private SecurityContext() {}

    public static void set(AuthenticatedUser user) {
        HOLDER.set(user);
    }

    public static Optional<AuthenticatedUser> currentOptional() {
        return Optional.ofNullable(HOLDER.get());
    }

    public static AuthenticatedUser current() {
        return currentOptional()
                .orElseThrow(() -> new RuntimeException(ErrorCode.NO_AUTHENTICATED_USER_IN_CONTEXT.getCode()));
    }

    public static void clear() {
        HOLDER.remove();
    }

    public static void requireVerification() {
        if (!current().isVerified()) {
            throw new IllegalStateException(ErrorCode.NOT_VERIFIED.getCode());
        }
    }
}
