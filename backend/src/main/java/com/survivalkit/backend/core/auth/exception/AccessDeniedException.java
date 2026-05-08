package com.survivalkit.backend.core.auth.exception;

import com.survivalkit.backend.shared.RoleLevel;

public class AccessDeniedException extends RuntimeException {
    public AccessDeniedException(RoleLevel requiredRole) {
        super("Access Denied. You're role (" + requiredRole + ") is not allowed to Access this endpoint");
    }
}
