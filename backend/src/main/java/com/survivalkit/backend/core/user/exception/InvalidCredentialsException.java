package com.survivalkit.backend.core.user.exception;

public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException(String code) {
        super(code);
    }
}
