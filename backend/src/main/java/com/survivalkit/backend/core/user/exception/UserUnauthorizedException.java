package com.survivalkit.backend.core.user.exception;

public class UserUnauthorizedException extends RuntimeException {
    public UserUnauthorizedException(String code) {
        super(code);
    }
}
