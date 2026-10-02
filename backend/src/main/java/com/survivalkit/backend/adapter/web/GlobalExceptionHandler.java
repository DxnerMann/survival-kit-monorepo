package com.survivalkit.backend.adapter.web;

import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.security.SecurityLog;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.Part;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.Set;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Set<ErrorCode> QUIET_AUTH = Set.of(
            ErrorCode.UNAUTHORIZED,
            ErrorCode.TOKEN_INVALID_OR_EXPIRED,
            ErrorCode.NO_AUTHENTICATED_USER_IN_CONTEXT,
            ErrorCode.INVALID_PASSWORD_OR_EMAIL
    );

    private final SecurityLog securityLog;

    public GlobalExceptionHandler(SecurityLog securityLog) {
        this.securityLog = securityLog;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleError(Exception ex, HttpServletRequest request) {
        var resolved = resolveError(ex, request);
        record(resolved, ex, request);
        return ResponseEntity
                .status(resolved.httpStatus())
                .body(resolved);
    }

    private ApiError resolveError(Exception exception, HttpServletRequest request) {
        if (isUploadSizeLimitExceeded(exception)) {
            var path = request.getRequestURI();
            if (path.contains("/meme")) {
                return apiError(ErrorCode.MEME_FILE_TOO_LARGE);
            }
            if (path.contains("/chat")) {
                return apiError(ErrorCode.CHAT_FILE_TOO_LARGE);
            }
            return apiError(ErrorCode.PROFILE_PICTURE_TOO_LARGE);
        }
        try {
            return apiError(ErrorCode.fromCode(exception.getMessage()));
        } catch (IllegalArgumentException | NoSuchElementException ex) {
            return apiError(ErrorCode.UNKNOWN);
        }
    }

    private void record(ApiError error, Exception ex, HttpServletRequest request) {
        var code = ErrorCode.fromCode(error.errorCode());
        if (QUIET_AUTH.contains(code)) {
            return;
        }

        var detail = describe(request, error, ex);
        if (error.httpStatus().is5xxServerError()) {
            securityLog.logError(code.getErrorCategory(), detail);
            return;
        }
        securityLog.logWarning(code.getErrorCategory(), detail);
    }

    private String describe(HttpServletRequest request, ApiError error, Exception ex) {
        var message = new StringBuilder()
                .append(request.getMethod())
                .append(' ')
                .append(request.getRequestURI())
                .append(" — ")
                .append(error.message())
                .append(" (")
                .append(error.errorCode())
                .append(')');

        SecurityContext.currentOptional().ifPresent(user -> {
            if (user.username() != null && !user.username().isBlank()) {
                message.append(", user=").append(user.username());
            }
        });

        appendFile(request, message);

        if (error.httpStatus().is5xxServerError() && !error.errorCode().equals(ex.getMessage())) {
            message.append(", cause=").append(ex.getClass().getSimpleName());
            if (ex.getMessage() != null && !ex.getMessage().isBlank()) {
                message.append(": ").append(ex.getMessage());
            }
        }
        return message.toString();
    }

    private void appendFile(HttpServletRequest request, StringBuilder message) {
        var contentType = request.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("multipart/")) {
            return;
        }
        try {
            Part file = request.getPart("file");
            if (file == null) {
                return;
            }
            message.append(", file=").append(file.getSubmittedFileName())
                    .append(", declared=").append(file.getContentType())
                    .append(", bytes=").append(file.getSize());
        } catch (Exception ignored) {
            // The upload may already have been consumed.
        }
    }

    private ApiError apiError(ErrorCode errorCode) {
        return new ApiError(
                errorCode.getHttpStatus().value(),
                errorCode.getCode(),
                errorCode.getHttpStatus(),
                errorCode.getMessage(),
                Instant.now()
        );
    }

    private boolean isUploadSizeLimitExceeded(Throwable exception) {
        var current = exception;
        while (current != null) {
            if (current.getClass().getName().equals("org.apache.tomcat.util.http.fileupload.impl.SizeLimitExceededException")
                    || current.getClass().getName().equals("org.springframework.web.multipart.MaxUploadSizeExceededException")
                    || (current.getMessage() != null && current.getMessage().contains("SizeLimitExceededException"))) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
