package com.survivalkit.backend.adapter.web;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.adapter.rapla.CourseExtractionFailedException;
import com.survivalkit.backend.core.user.exception.*;
import com.survivalkit.backend.core.course.CourseNotFoundException;
import com.survivalkit.backend.core.security.SecurityLog;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private final SecurityLog securityLog;

    public GlobalExceptionHandler(SecurityLog securityLog) {
        this.securityLog = securityLog;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleError(Exception ex) {
        var resolved = resolveError(ex);
        return ResponseEntity
                .status(resolved.httpStatus())
                .body(resolved);
    }

    private ApiError resolveError(Exception exception) {
        var errorCode = ErrorCode.UNKNOWN;
        try {
            errorCode = ErrorCode.fromCode(exception.getMessage());
        } catch (IllegalArgumentException | NoSuchElementException ex) {
            exception.printStackTrace();
        } finally {
            securityLog.logError(
                errorCode.getErrorCategory(),
                errorCode.getMessage()
            );
        }
        return new ApiError(
                errorCode.getHttpStatus().value(),
                errorCode.getCode(),
                errorCode.getHttpStatus(),
                errorCode.getMessage(),
                Instant.now()
        );
    }

}