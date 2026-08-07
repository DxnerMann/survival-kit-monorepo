package com.survivalkit.backend.adapter.websocket;

import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.core.security.SessionCookieService;
import com.survivalkit.backend.core.security.TokenService;
import com.survivalkit.backend.shared.RoleLevel;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    public static final String USER_CONTEXT_ATTRIBUTE = "wsUserContext";
    private final SessionCookieService sessionCookieService;
    private final TokenService tokenService;
    private final UserPersistancePort userPersistancePort;

    public WebSocketHandshakeInterceptor(
            SessionCookieService sessionCookieService,
            TokenService tokenService,
            UserPersistancePort userPersistancePort
    ) {
        this.sessionCookieService = sessionCookieService;
        this.tokenService = tokenService;
        this.userPersistancePort = userPersistancePort;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        var token = extractToken(request);
        if (token == null) {
            return false;
        }

        var authenticatedUser = tokenService.validate(token).orElse(null);
        if (authenticatedUser == null || authenticatedUser.role() == RoleLevel.GUEST) {
            return false;
        }

        if (!Boolean.TRUE.equals(authenticatedUser.isVerified())) {
            return false;
        }

        var userModel = userPersistancePort.getById(authenticatedUser.userId()).orElse(null);
        if (userModel == null) {
            return false;
        }

        attributes.put(
                USER_CONTEXT_ATTRIBUTE,
                new WebSocketUserContext(
                        userModel.id(),
                        userModel.username(),
                        userModel.course()
                )
        );
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
    }

    private String extractToken(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            var httpRequest = servletRequest.getServletRequest();
            var token = sessionCookieService.extractToken(httpRequest);
            if (token != null) {
                return token;
            }
        }

        var query = request.getURI().getQuery();
        if (query == null || query.isBlank()) {
            return null;
        }

        for (var part : query.split("&")) {
            var keyValue = part.split("=", 2);
            if (keyValue.length == 2 && "token".equals(keyValue[0]) && !keyValue[1].isBlank()) {
                return keyValue[1];
            }
        }
        return null;
    }
}
