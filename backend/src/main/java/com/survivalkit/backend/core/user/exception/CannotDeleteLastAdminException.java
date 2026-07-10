package com.survivalkit.backend.core.user.exception;

public class CannotDeleteLastAdminException extends RuntimeException {
    public CannotDeleteLastAdminException(String code) {
        super(code);
    }
}
