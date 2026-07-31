package com.survivalkit.backend.core.security;

public class RateLimitExceededException extends RuntimeException {
    public RateLimitExceededException(String code) {
        super(code);
    }
}
