package com.survivalkit.backend.config;

import com.survivalkit.backend.adapter.websocket.WebSocketHandler;
import com.survivalkit.backend.adapter.websocket.WebSocketHandshakeInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.ArrayList;
import java.util.Arrays;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final WebSocketHandler webSocketHandler;
    private final WebSocketHandshakeInterceptor handshakeInterceptor;
    private final Environment environment;

    public WebSocketConfig(
            WebSocketHandler webSocketHandler,
            WebSocketHandshakeInterceptor handshakeInterceptor,
            Environment environment
    ) {
        this.webSocketHandler = webSocketHandler;
        this.handshakeInterceptor = handshakeInterceptor;
        this.environment = environment;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketHandler, "/v1/ws")
                .addInterceptors(handshakeInterceptor)
                .setAllowedOrigins(allowedOrigins());
    }

    private String[] allowedOrigins() {
        var origins = new ArrayList<String>();
        origins.add("https://lecture-survival-kit.jannis-saur.de");

        if (Arrays.asList(environment.getActiveProfiles()).contains("local")) {
            origins.add("http://localhost:5173");
            origins.add("http://localhost:80");
            origins.add("http://localhost");
        }

        return origins.toArray(String[]::new);
    }
}
