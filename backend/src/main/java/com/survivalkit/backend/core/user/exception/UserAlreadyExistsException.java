package com.survivalkit.backend.core.user.exception;

public class UserAlreadyExistsException extends RuntimeException {
    public UserAlreadyExistsException(String code) {
        super(code);
    }
}
