package com.survivalkit.backend.adapter.web;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.adapter.rapla.CourseExtractionFailedException;
import com.survivalkit.backend.core.user.exception.AccessDeniedException;
import com.survivalkit.backend.core.user.exception.InvalidCredentialsException;
import com.survivalkit.backend.core.user.exception.UserAlreadyExistsException;
import com.survivalkit.backend.core.user.exception.UserNotFoundException;
import com.survivalkit.backend.core.user.exception.UserUnauthorizedException;
import com.survivalkit.backend.core.course.CourseNotFoundException;
import com.survivalkit.backend.core.security.SecurityLog;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private final SecurityLog securityLog;

    public GlobalExceptionHandler(SecurityLog securityLog) {
        this.securityLog = securityLog;
    }

    @ExceptionHandler(UserUnauthorizedException.class)
    public ResponseEntity<ApiError> handleGeneric(UserUnauthorizedException ex) {
        securityLog.logError(Log.SecurityLogSubType.AUTH, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiError(401, HttpStatus.UNAUTHORIZED.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleGeneric(AccessDeniedException ex) {
        securityLog.logError(Log.SecurityLogSubType.AUTH, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ApiError(403, HttpStatus.FORBIDDEN.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<ApiError> handleGeneric(UserAlreadyExistsException ex) {
        securityLog.logError(Log.SecurityLogSubType.AUTH, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(400, HttpStatus.BAD_REQUEST.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleGeneric(IllegalArgumentException ex) {
        securityLog.logWarning(Log.SecurityLogSubType.API, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(400, HttpStatus.BAD_REQUEST.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleGeneric(InvalidCredentialsException ex) {
        securityLog.logError(Log.SecurityLogSubType.AUTH, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(400, HttpStatus.BAD_REQUEST.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(CourseNotFoundException.class)
    public ResponseEntity<ApiError> handleGeneric(CourseNotFoundException ex) {
        securityLog.logError(Log.SecurityLogSubType.API, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ApiError(404, HttpStatus.NOT_FOUND.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(CourseExtractionFailedException.class)
    public ResponseEntity<ApiError> handleGeneric(CourseExtractionFailedException ex) {
        securityLog.logError(Log.SecurityLogSubType.RAPLA, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(400, HttpStatus.BAD_REQUEST.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiError> handleGeneric(UserNotFoundException ex) {
        securityLog.logError(Log.SecurityLogSubType.API, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ApiError(404, HttpStatus.NOT_FOUND.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex) {
        ex.printStackTrace();
        securityLog.logError(Log.SecurityLogSubType.UNCATEGORIZED, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError(500, HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase().toUpperCase(),"An unexpected error occurred", Instant.now()));
    }

}