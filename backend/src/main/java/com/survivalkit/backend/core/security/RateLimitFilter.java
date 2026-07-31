package com.survivalkit.backend.core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;
import java.time.Duration;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;
    private final HandlerExceptionResolver exceptionResolver;

    public RateLimitFilter(
            RateLimitService rateLimitService,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver
    ) {
        this.rateLimitService = rateLimitService;
        this.exceptionResolver = exceptionResolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        try {
            applyLimits(request);
            filterChain.doFilter(request, response);
        } catch (RateLimitExceededException ex) {
            exceptionResolver.resolveException(request, response, null, ex);
        }
    }

    private void applyLimits(HttpServletRequest request) {
        var path = request.getRequestURI();
        var method = request.getMethod();
        var clientKey = clientKey(request);

        if ("POST".equalsIgnoreCase(method) && path.equals("/v1/auth/login")) {
            rateLimitService.check("auth-login", clientKey, 10, Duration.ofMinutes(1));
            return;
        }

        if ("POST".equalsIgnoreCase(method) && path.equals("/v1/auth/register")) {
            rateLimitService.check("auth-register", clientKey, 5, Duration.ofMinutes(1));
            return;
        }

        if ("POST".equalsIgnoreCase(method) && path.equals("/v1/auth/resend")) {
            rateLimitService.check("auth-resend", clientKey, 3, Duration.ofMinutes(1));
            return;
        }

        if ("GET".equalsIgnoreCase(method) && path.equals("/v1/auth/verify")) {
            rateLimitService.check("auth-verify", clientKey, 30, Duration.ofMinutes(1));
            return;
        }

        if ("PUT".equalsIgnoreCase(method) && path.equals("/v1/auth/password")) {
            rateLimitService.check("auth-password", clientKey, 5, Duration.ofMinutes(1));
            return;
        }

        if (path.startsWith("/v1/lecture")) {
            rateLimitService.check("lecture", clientKey, 60, Duration.ofMinutes(1));
        }
    }

    private String clientKey(HttpServletRequest request) {
        var forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
