package com.survivalkit.backend.core.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class SessionCookieService {

    public static final String COOKIE_NAME = "session";

    private final long expirationMs;

    public SessionCookieService(@Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.expirationMs = expirationMs;
    }

    public void setSessionCookie(HttpServletRequest request, HttpServletResponse response, String token) {
        var cookie = ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .secure(request.isSecure())
                .path("/")
                .maxAge(Duration.ofMillis(expirationMs))
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clearSessionCookie(HttpServletRequest request, HttpServletResponse response) {
        var cookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(request.isSecure())
                .path("/")
                .maxAge(Duration.ZERO)
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public String extractToken(HttpServletRequest request) {
        var authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            var bearer = authHeader.substring("Bearer ".length()).trim();
            if (!bearer.isEmpty()) {
                return bearer;
            }
        }

        var cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (var cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                var value = cookie.getValue();
                if (value != null && !value.isBlank()) {
                    return value;
                }
            }
        }
        return null;
    }
}
