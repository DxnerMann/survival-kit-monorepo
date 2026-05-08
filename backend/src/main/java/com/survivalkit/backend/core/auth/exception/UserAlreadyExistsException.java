package com.survivalkit.backend.core.auth.exception;

public class UserAlreadyExistsException extends RuntimeException {
    public UserAlreadyExistsException(String email, String username) {
        super("There already exists a user with email " + email + " or username " + username);
    }
}
