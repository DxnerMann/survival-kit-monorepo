package com.survivalkit.backend.adapter.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.core.websocket.WebSocketService;
import com.survivalkit.backend.shared.WebSocketEnvelope;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class WebSocketHandler extends TextWebSocketHandler {

    private final WebSocketService webSocketService;
    private final WebSocketSessionRegistry sessionRegistry;
    private final ObjectMapper objectMapper;

    public WebSocketHandler(
            WebSocketService webSocketService,
            WebSocketSessionRegistry sessionRegistry,
            ObjectMapper objectMapper
    ) {
        this.webSocketService = webSocketService;
        this.sessionRegistry = sessionRegistry;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        var user = (WebSocketUserContext) session.getAttributes().get(WebSocketHandshakeInterceptor.USER_CONTEXT_ATTRIBUTE);
        if (user == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        sessionRegistry.register(session, user);
        webSocketService.sendConnectedAck(session, user);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        var envelope = objectMapper.readValue(message.getPayload(), WebSocketEnvelope.class);
        webSocketService.handleIncoming(session, envelope);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessionRegistry.unregister(session.getId());
    }
}
