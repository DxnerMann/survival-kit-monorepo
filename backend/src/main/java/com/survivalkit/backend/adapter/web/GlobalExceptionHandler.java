package com.survivalkit.backend.adapter.web;

import com.survivalkit.backend.adapter.rapla.CourseExtractionFailedException;
import com.survivalkit.backend.core.auth.exception.AccessDeniedException;
import com.survivalkit.backend.core.auth.exception.InvalidCredentialsException;
import com.survivalkit.backend.core.auth.exception.UserAlreadyExistsException;
import com.survivalkit.backend.core.auth.exception.UserUnauthorizedException;
import com.survivalkit.backend.core.course.CourseNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UserUnauthorizedException.class)
    public ResponseEntity<ApiError> handleGeneric(UserUnauthorizedException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiError(401, HttpStatus.UNAUTHORIZED.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleGeneric(AccessDeniedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ApiError(403, HttpStatus.FORBIDDEN.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<ApiError> handleGeneric(UserAlreadyExistsException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(400, HttpStatus.BAD_REQUEST.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleGeneric(IllegalArgumentException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(400, HttpStatus.BAD_REQUEST.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleGeneric(InvalidCredentialsException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(400, HttpStatus.BAD_REQUEST.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(CourseNotFoundException.class)
    public ResponseEntity<ApiError> handleGeneric(CourseNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ApiError(404, HttpStatus.NOT_FOUND.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(CourseExtractionFailedException.class)
    public ResponseEntity<ApiError> handleGeneric(CourseExtractionFailedException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiError(400, HttpStatus.BAD_REQUEST.getReasonPhrase().toUpperCase(),ex.getMessage(), Instant.now()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex) {
        ex.printStackTrace();
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError(500, HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase().toUpperCase(),"An unexpected error occurred", Instant.now()));
    }

}