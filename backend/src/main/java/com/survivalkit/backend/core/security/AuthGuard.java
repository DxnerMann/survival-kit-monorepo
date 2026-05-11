package com.survivalkit.backend.core.security;

import com.survivalkit.backend.config.SecurityContext;
import com.survivalkit.backend.core.auth.exception.AccessDeniedException;
import com.survivalkit.backend.core.auth.exception.UserUnauthorizedException;
import com.survivalkit.backend.shared.Role;
import com.survivalkit.backend.shared.RoleLevel;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
public class AuthGuard extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private final TokenService tokenService;
    private final RequestMappingHandlerMapping handlerMapping;
    private final HandlerExceptionResolver exceptionResolver;
    private final Environment environment;

    public AuthGuard(
            TokenService tokenService,
            RequestMappingHandlerMapping handlerMapping,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver, Environment environment
    ) {
        this.tokenService = tokenService;
        this.handlerMapping = handlerMapping;
        this.exceptionResolver = exceptionResolver;
        this.environment = environment;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        var requiredRole = resolveRequiredRole(request);

        if (requiredRole == RoleLevel.GUEST) {
            filterChain.doFilter(request, response);
            return;
        }

        if (isLocalProfile()) {
            try {
                var token = request.getHeader("Authorization")
                        .substring(BEARER_PREFIX.length()).trim();
                var user = tokenService.validate(token).get();
                SecurityContext.set(user);

            } catch (Exception e) {
                e.printStackTrace();
            }
            filterChain.doFilter(request, response);
            return;
        }

        try {
            var authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
                throw new UserUnauthorizedException("User Unauthorized");
            }

            var token = authHeader.substring(BEARER_PREFIX.length()).trim();
            var maybeUser = tokenService.validate(token);

            if (maybeUser.isEmpty()) {
                throw new UserUnauthorizedException("Invalid or expired token.");
            }

            var user = maybeUser.get();

            if (!user.isVerified()) {
                throw new UserUnauthorizedException("User not Verified Yet.");
            }

            if (!user.role().hasAtLeast(requiredRole)) {
                throw new AccessDeniedException(requiredRole);
            }

            SecurityContext.set(user);
            try {
                filterChain.doFilter(request, response);
            } finally {
                SecurityContext.clear();
            }

        } catch (UserUnauthorizedException | AccessDeniedException ex) {
            exceptionResolver.resolveException(request, response, null, ex);
        }
    }

    private static final List<String> SWAGGER_PATHS = List.of(
            "/v3/api-docs",
            "/v3/api-docs/swagger-config",
            "/swagger-ui/index.html",
            "/swagger-ui/swagger-initializer.js"
    );

    private RoleLevel resolveRequiredRole(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (SWAGGER_PATHS.stream().anyMatch(path::startsWith)) return RoleLevel.GUEST;

        try {
            var handlerExecutionChain = handlerMapping.getHandler(request);

            if (handlerExecutionChain == null) return RoleLevel.GUEST;

            var handler = handlerExecutionChain.getHandler();
            if (handler instanceof HandlerMethod method) {
                var methodRole = method.getMethodAnnotation(Role.class);
                if (methodRole != null) return methodRole.value();

                var classRole = method.getBeanType().getAnnotation(Role.class);
                if (classRole != null) return classRole.value();

                return RoleLevel.USER;
            }

            return RoleLevel.GUEST;

        } catch (Exception ignored) {
            return RoleLevel.GUEST;
        }
    }

    private boolean isLocalProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("local");
    }

}