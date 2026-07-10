package com.survivalkit.backend.adapter.web;

import org.springframework.http.HttpStatus;

import java.time.Instant;

public record ApiError(
        int httpStatusCode,
        String errorCode,
        HttpStatus httpStatus,
        String message,
        Instant timestamp
) {
}