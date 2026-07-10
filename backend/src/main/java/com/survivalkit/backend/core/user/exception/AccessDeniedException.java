package com.survivalkit.backend.core.user.exception;

import com.survivalkit.backend.shared.RoleLevel;

public class AccessDeniedException extends RuntimeException {
    public AccessDeniedException(String code) {
        super(code);
    }
}
