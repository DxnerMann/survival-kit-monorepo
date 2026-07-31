package com.survivalkit.backend.core.security;

import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.user.AuthenticatedUser;
import com.survivalkit.backend.core.user.exception.AccessDeniedException;
import com.survivalkit.backend.core.user.exception.UserUnauthorizedException;
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

@Component
public class AuthGuard extends OncePerRequestFilter {

    private final TokenService tokenService;
    private final SessionCookieService sessionCookieService;
    private final RequestMappingHandlerMapping handlerMapping;
    private final HandlerExceptionResolver exceptionResolver;
    private final Environment environment;

    public AuthGuard(
            TokenService tokenService,
            SessionCookieService sessionCookieService,
            RequestMappingHandlerMapping handlerMapping,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver,
            Environment environment
    ) {
        this.tokenService = tokenService;
        this.sessionCookieService = sessionCookieService;
        this.handlerMapping = handlerMapping;
        this.exceptionResolver = exceptionResolver;
        this.environment = environment;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        try {
            var requiredRole = resolveRequiredRole(request);

            if (requiredRole == RoleLevel.GUEST) {
                authenticateOptional(request);
                filterChain.doFilter(request, response);
                return;
            }

            var user = authenticateRequired(request);

            if (isLocalProfile() && user == null) {
                user = new AuthenticatedUser("", "local-admin-id", "Admin", RoleLevel.ADMIN, "email", true);
            }

            if (user == null) {
                throw new UserUnauthorizedException(ErrorCode.UNAUTHORIZED.getCode());
            }

            if (!user.role().hasAtLeast(requiredRole)) {
                throw new AccessDeniedException(ErrorCode.NOT_REQUIRED_ROLE.getCode());
            }

            SecurityContext.set(user);
            filterChain.doFilter(request, response);

        } catch (UserUnauthorizedException | AccessDeniedException ex) {
            exceptionResolver.resolveException(request, response, null, ex);
        } finally {
            SecurityContext.clear();
        }
    }

    private void authenticateOptional(HttpServletRequest request) {
        var token = sessionCookieService.extractToken(request);
        if (token == null) {
            return;
        }
        tokenService.validate(token).ifPresent(SecurityContext::set);
    }

    private AuthenticatedUser authenticateRequired(HttpServletRequest request) {
        var token = sessionCookieService.extractToken(request);
        if (token == null) {
            return null;
        }

        return tokenService.validate(token).orElseThrow(
                () -> new UserUnauthorizedException(ErrorCode.TOKEN_INVALID_OR_EXPIRED.getCode())
        );
    }

    private RoleLevel resolveRequiredRole(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.startsWith("/v3/api-docs") || path.startsWith("/swagger-ui")) {
            return RoleLevel.ADMIN;
        }

        try {
            var handlerExecutionChain = handlerMapping.getHandler(request);

            if (handlerExecutionChain == null) {
                return RoleLevel.USER;
            }

            var handler = handlerExecutionChain.getHandler();
            if (handler instanceof HandlerMethod method) {
                var methodRole = method.getMethodAnnotation(Role.class);
                if (methodRole != null) return methodRole.value();

                var classRole = method.getBeanType().getAnnotation(Role.class);
                if (classRole != null) return classRole.value();

                return RoleLevel.USER;
            }

            return RoleLevel.USER;

        } catch (Exception e) {
            return RoleLevel.USER;
        }
    }

    private boolean isLocalProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("local");
    }

}
