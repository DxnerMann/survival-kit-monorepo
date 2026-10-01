package com.survivalkit.backend.core.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
public class GuestCookieService {

    public static final String COOKIE_NAME = "guestId";
    private static final Duration MAX_AGE = Duration.ofDays(30);

    public void setGuestCookie(HttpServletRequest request, HttpServletResponse response, String guestId) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(request, guestId, MAX_AGE).toString());
    }

    public void clearGuestCookie(HttpServletRequest request, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(request, "", Duration.ZERO).toString());
    }

    public String readGuestId(HttpServletRequest request) {
        var cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (var cookie : cookies) {
            if (!COOKIE_NAME.equals(cookie.getName())) {
                continue;
            }
            var value = cookie.getValue();
            if (value == null || value.isBlank()) {
                return null;
            }
            try {
                return UUID.fromString(value).toString();
            } catch (IllegalArgumentException ex) {
                return null;
            }
        }
        return null;
    }

    private ResponseCookie cookie(HttpServletRequest request, String value, Duration maxAge) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(request.isSecure())
                .path("/")
                .maxAge(maxAge)
                .sameSite("Strict")
                .build();
    }
}
