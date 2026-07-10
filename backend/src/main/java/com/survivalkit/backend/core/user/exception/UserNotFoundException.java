package com.survivalkit.backend.core.user.exception;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String code) {
        super(code);
    }
}
