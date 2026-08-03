package com.survivalkit.backend.core.websocket;

import com.survivalkit.backend.shared.WebSocketEnvelope;
import org.springframework.web.socket.WebSocketSession;

public interface WebSocketPort {

    void handleIncoming(WebSocketSession session, WebSocketEnvelope envelope);

    void sendToSession(WebSocketSession session, WebSocketEnvelope envelope);

    void sendToChannel(String channel, WebSocketEnvelope envelope, String excludeSessionId);

    void sendToUser(String userId, WebSocketEnvelope envelope);

    void broadcastToChannel(String channel, WebSocketEnvelope envelope);
}
