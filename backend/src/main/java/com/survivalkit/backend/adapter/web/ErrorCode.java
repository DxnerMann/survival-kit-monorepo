package com.survivalkit.backend.adapter.web;

import org.springframework.http.HttpStatus;

import java.util.Arrays;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

public enum ErrorCode {

    // UNKNOWN (00x)
    UNKNOWN("00x00000000", "Unknown error", HttpStatus.INTERNAL_SERVER_ERROR, ErrorCategory.UNKNOWN),

    // AUTHENTICATION (01x)
    UNAUTHORIZED("01x00000000", "User unauthorized", HttpStatus.UNAUTHORIZED, ErrorCategory.AUTHENTICATION),
    INVALID_PASSWORD_OR_EMAIL("01x00000001", "Invalid password or email", HttpStatus.UNAUTHORIZED, ErrorCategory.AUTHENTICATION),
    NOT_VERIFIED("01x00000002", "User is not verified", HttpStatus.FORBIDDEN, ErrorCategory.AUTHENTICATION),
    TOKEN_INVALID_OR_EXPIRED("01x00000003", "Authentication token is invalid or expired", HttpStatus.UNAUTHORIZED, ErrorCategory.AUTHENTICATION),
    USER_DOES_NOT_EXIST("01x00000004", "User does not exist", HttpStatus.NOT_FOUND, ErrorCategory.AUTHENTICATION),
    OLD_PASSWORD_INVALID("01x00000005", "Old password is invalid", HttpStatus.BAD_REQUEST, ErrorCategory.AUTHENTICATION),
    PASSWORD_NOT_VALID("01x00000006", "Password does not fulfill the requirements", HttpStatus.BAD_REQUEST, ErrorCategory.AUTHENTICATION),
    UNABLE_TO_DELETE_LAST_ADMIN("01x00000007", "Cannot delete the last admin", HttpStatus.CONFLICT, ErrorCategory.AUTHENTICATION),
    EMAIL_NOT_VALID("01x00000008", "Email must be valid", HttpStatus.BAD_REQUEST, ErrorCategory.AUTHENTICATION),
    NO_AUTHENTICATED_USER_IN_CONTEXT("01x00000009", "No authenticated user in context. Ensure this is called within a secured request.", HttpStatus.UNAUTHORIZED, ErrorCategory.AUTHENTICATION),
    NOT_REQUIRED_ROLE("01x0000000A", "User does not have the required role", HttpStatus.FORBIDDEN, ErrorCategory.AUTHENTICATION),
    USER_ALREADY_EXISTS("01x0000000B", "There already exists a user with the provided email or username", HttpStatus.CONFLICT, ErrorCategory.AUTHENTICATION),
    RATE_LIMIT_EXCEEDED("01x0000000C", "Too many requests", HttpStatus.TOO_MANY_REQUESTS, ErrorCategory.AUTHENTICATION),

    // EMAIL (02x)
    FAILED_TO_SEND_EMAIL("02x00000000", "Failed to send email", HttpStatus.INTERNAL_SERVER_ERROR, ErrorCategory.EMAIL),

    // USER (03x)
    MISSING_CONTENT_TYPE_PROFILE_PICTURE("03x00000000", "Failed to set profile picture, due to missing content type", HttpStatus.BAD_REQUEST, ErrorCategory.USER),
    UNSUPPORTED_CONTENT_TYPE_PROFILE_PICTURE("03x00000001", "Failed to set profile picture, due to unsupported content type", HttpStatus.UNSUPPORTED_MEDIA_TYPE, ErrorCategory.USER),
    FAILED_TO_READ_IMAGE_BYTES("03x00000002", "Failed to read bytes of the provided image", HttpStatus.BAD_REQUEST, ErrorCategory.USER),
    FAILED_TO_LOAD_DEFAULT_PICTURE("03x00000003", "Failed to load default profile picture", HttpStatus.INTERNAL_SERVER_ERROR, ErrorCategory.USER),
    INVALID_COLOR("03x00000004", "Failed to set profile color: invalid hex color", HttpStatus.BAD_REQUEST, ErrorCategory.USER),
    USERNAME_CHANGE_TO_EARLY("03x00000005", "Username can only be changed once every 30 days", HttpStatus.CONFLICT, ErrorCategory.USER),

    // EXTERNAL SERVICE (04x)
    COURSE_EXTRACTION_FAILED("04x00000000", "Failed to extract course from provided Rapla URL", HttpStatus.BAD_GATEWAY, ErrorCategory.EXTERNAL),
    RAPLA_URL_NOT_ALLOWED("04x00000001", "Rapla URL host is not allowed", HttpStatus.BAD_REQUEST, ErrorCategory.EXTERNAL),
    RAPLA_REQUEST_FAILED("04x00000002", "Failed to request data from Rapla", HttpStatus.BAD_GATEWAY, ErrorCategory.EXTERNAL),
    CATAAS_REQUEST_FAILED("04x00000003", "Failed to request data from Cat as a Service", HttpStatus.BAD_GATEWAY, ErrorCategory.EXTERNAL),

    // QUICKLINK (05x)
    QUICKLINK_TITLE_CANNOT_BE_EMPTY("05x00000000", "Quicklink title cannot be empty", HttpStatus.BAD_REQUEST, ErrorCategory.QUICKLINK),
    QUICKLINK_DESCRIPTION_CANNOT_BE_EMPTY("05x00000001", "Quicklink description cannot be empty", HttpStatus.BAD_REQUEST, ErrorCategory.QUICKLINK),
    QUICKLINK_URL_CANNOT_BE_EMPTY("05x00000002", "Quicklink URL cannot be empty", HttpStatus.BAD_REQUEST, ErrorCategory.QUICKLINK),
    QUICKLINK_URL_INVALID("05x00000003", "Quicklink URL must be a valid http(s) URL", HttpStatus.BAD_REQUEST, ErrorCategory.QUICKLINK),

    // LECTURE (06x)
    RAPLA_URL_AND_COURSE_EMPTY("06x00000000", "Rapla URL and course cannot both be empty", HttpStatus.BAD_REQUEST, ErrorCategory.LECTURE),
    COURSE_NOT_FOUND("06x00000001", "Course not found", HttpStatus.NOT_FOUND, ErrorCategory.LECTURE),

    // WIDGET (07x)
    FAILED_TO_READ_WIDGET_DATA("07x00000000", "Failed to read data of the widget", HttpStatus.INTERNAL_SERVER_ERROR, ErrorCategory.WIDGET),
    WIDGET_NOT_FOUND("07x00000001", "Widget not found or not owned by user", HttpStatus.NOT_FOUND, ErrorCategory.WIDGET),

    // CAFFEINE (08x)
    CAFFEINE_AMOUNT_INVALID("08x00000000", "Caffeine amount must be between 1 and 1000 mg", HttpStatus.BAD_REQUEST, ErrorCategory.CAFFEINE),
    CAFFEINE_SOURCE_INVALID("08x00000001", "Caffeine source is invalid", HttpStatus.BAD_REQUEST, ErrorCategory.CAFFEINE),
    CAFFEINE_TIMESTAMP_INVALID("08x00000002", "Caffeine timestamp is invalid", HttpStatus.BAD_REQUEST, ErrorCategory.CAFFEINE),
    CAFFEINE_ENTRY_NOT_FOUND("08x00000003", "Caffeine entry not found", HttpStatus.NOT_FOUND, ErrorCategory.CAFFEINE);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
    private final ErrorCategory errorCategory;

    ErrorCode(String code, String message, HttpStatus httpStatus, ErrorCategory errorCategory) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
        this.errorCategory = errorCategory;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public ErrorCategory getErrorCategory() {
        return errorCategory;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public enum ErrorCategory {
        UNKNOWN,
        AUTHENTICATION,
        EMAIL,
        USER,
        EXTERNAL,
        QUICKLINK,
        LECTURE,
        WIDGET,
        COURSE,
        FEEDBACK,
        CAFFEINE
    }

    private static final Map<String, ErrorCode> BY_CODE = Arrays.stream(values())
            .collect(Collectors.toMap(ErrorCode::getCode, e -> e));

    public static ErrorCode fromCode(String code) {
        ErrorCode result = BY_CODE.get(code);
        if (result == null) {
            throw new NoSuchElementException("No ErrorCode found for code: " + code);
        }
        return result;
    }
}
