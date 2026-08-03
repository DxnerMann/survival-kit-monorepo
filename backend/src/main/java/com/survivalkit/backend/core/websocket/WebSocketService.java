package com.survivalkit.backend.core.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.survivalkit.backend.adapter.websocket.WebSocketSessionRegistry;
import com.survivalkit.backend.adapter.websocket.WebSocketUserContext;
import com.survivalkit.backend.shared.WebSocketChannels;
import com.survivalkit.backend.shared.WebSocketEnvelope;
import com.survivalkit.backend.shared.WebSocketMessageType;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.time.Instant;

@Service
public class WebSocketService implements WebSocketPort {

    private final WebSocketSessionRegistry sessionRegistry;
    private final CourseChannelAccessValidator channelAccessValidator;
    private final ObjectMapper objectMapper;

    public WebSocketService(
            WebSocketSessionRegistry sessionRegistry,
            CourseChannelAccessValidator channelAccessValidator,
            ObjectMapper objectMapper
    ) {
        this.sessionRegistry = sessionRegistry;
        this.channelAccessValidator = channelAccessValidator;
        this.objectMapper = objectMapper;
    }

    @Override
    public void handleIncoming(WebSocketSession session, WebSocketEnvelope envelope) {
        if (envelope.type() == null || envelope.type().isBlank()) {
            sendError(session, "MISSING_TYPE", "Message type is required.");
            return;
        }

        switch (envelope.type()) {
            case WebSocketMessageType.JOIN -> handleJoin(session, envelope.channel());
            case WebSocketMessageType.LEAVE -> handleLeave(session, envelope.channel());
            case WebSocketMessageType.MESSAGE -> handleMessage(session, envelope);
            default -> sendError(session, "UNKNOWN_TYPE", "Unsupported message type: " + envelope.type());
        }
    }

    @Override
    public void sendToSession(WebSocketSession session, WebSocketEnvelope envelope) {
        if (session == null || !session.isOpen()) {
            return;
        }

        try {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(envelope)));
        } catch (IOException ignored) {
        }
    }

    @Override
    public void sendToChannel(String channel, WebSocketEnvelope envelope, String excludeSessionId) {
        for (var session : sessionRegistry.getSessionsInChannel(channel)) {
            if (excludeSessionId != null && excludeSessionId.equals(session.getId())) {
                continue;
            }
            sendToSession(session, envelope);
        }
    }

    @Override
    public void sendToUser(String userId, WebSocketEnvelope envelope) {
        for (var session : sessionRegistry.getSessionsForUser(userId)) {
            sendToSession(session, envelope);
        }
    }

    @Override
    public void broadcastToChannel(String channel, WebSocketEnvelope envelope) {
        sendToChannel(channel, envelope, null);
    }

    public void sendConnectedAck(WebSocketSession session, WebSocketUserContext user) {
        var payload = objectMapper.createObjectNode()
                .put("userId", user.userId())
                .put("username", user.username())
                .put("course", user.course());

        sendToSession(session, WebSocketEnvelope.of(WebSocketMessageType.CONNECTED, payload));
    }

    private void handleJoin(WebSocketSession session, String channel) {
        var user = sessionRegistry.getUser(session.getId()).orElse(null);
        if (user == null) {
            sendError(session, "NOT_AUTHENTICATED", "Session is not authenticated.");
            return;
        }

        if (channel == null || channel.isBlank()) {
            sendError(session, "MISSING_CHANNEL", "Channel is required for JOIN.");
            return;
        }

        var validationError = channelAccessValidator.validateJoin(toView(user), channel);
        if (validationError.isPresent()) {
            sendError(session, validationError.get(), validationErrorMessage(validationError.get()));
            return;
        }

        sessionRegistry.join(session.getId(), channel);

        var joinedPayload = objectMapper.createObjectNode()
                .put("userId", user.userId())
                .put("username", user.username())
                .put("channel", channel);

        sendToSession(session, WebSocketEnvelope.of(WebSocketMessageType.JOINED, channel, joinedPayload));
        broadcastPresence(WebSocketMessageType.JOINED, channel, user, session.getId());
    }

    private void handleLeave(WebSocketSession session, String channel) {
        var user = sessionRegistry.getUser(session.getId()).orElse(null);
        if (user == null) {
            sendError(session, "NOT_AUTHENTICATED", "Session is not authenticated.");
            return;
        }

        if (channel == null || channel.isBlank()) {
            sendError(session, "MISSING_CHANNEL", "Channel is required for LEAVE.");
            return;
        }

        sessionRegistry.leave(session.getId(), channel);

        var leftPayload = objectMapper.createObjectNode()
                .put("userId", user.userId())
                .put("username", user.username())
                .put("channel", channel);

        sendToSession(session, WebSocketEnvelope.of(WebSocketMessageType.LEFT, channel, leftPayload));
        broadcastPresence(WebSocketMessageType.LEFT, channel, user, session.getId());
    }

    private void handleMessage(WebSocketSession session, WebSocketEnvelope envelope) {
        var user = sessionRegistry.getUser(session.getId()).orElse(null);
        if (user == null) {
            sendError(session, "NOT_AUTHENTICATED", "Session is not authenticated.");
            return;
        }

        var channel = envelope.channel();
        if (channel == null || channel.isBlank()) {
            sendError(session, "MISSING_CHANNEL", "Channel is required for MESSAGE.");
            return;
        }

        if (!sessionRegistry.isInChannel(session.getId(), channel)) {
            sendError(session, "NOT_IN_CHANNEL", "Join the channel before sending messages.");
            return;
        }

        if (WebSocketChannels.parse(channel).isEmpty()) {
            sendError(session, "INVALID_CHANNEL", "Channel format is invalid.");
            return;
        }

        var relayPayload = wrapOutgoingPayload(user, envelope.payload());
        var relay = WebSocketEnvelope.of(WebSocketMessageType.MESSAGE, channel, relayPayload);
        sendToChannel(channel, relay, session.getId());
    }

    private ObjectNode wrapOutgoingPayload(WebSocketUserContext user, JsonNode payload) {
        var wrapped = objectMapper.createObjectNode()
                .put("userId", user.userId())
                .put("username", user.username())
                .put("sentAt", Instant.now().toString());

        if (payload != null && !payload.isNull()) {
            wrapped.set("data", payload);
        } else {
            wrapped.set("data", objectMapper.nullNode());
        }

        return wrapped;
    }

    private void broadcastPresence(String type, String channel, WebSocketUserContext user, String excludeSessionId) {
        var payload = objectMapper.createObjectNode()
                .put("userId", user.userId())
                .put("username", user.username())
                .put("channel", channel);

        sendToChannel(channel, WebSocketEnvelope.of(type, channel, payload), excludeSessionId);
    }

    private void sendError(WebSocketSession session, String code, String message) {
        var payload = objectMapper.createObjectNode()
                .put("code", code)
                .put("message", message);
        sendToSession(session, WebSocketEnvelope.of(WebSocketMessageType.ERROR, payload));
    }

    private WebSocketUserContextView toView(WebSocketUserContext user) {
        return new WebSocketUserContextView(user.userId(), user.username(), user.course());
    }

    private String validationErrorMessage(String code) {
        return switch (code) {
            case "NO_COURSE_SET" -> "Set your course in profile settings before joining.";
            case "INVALID_CHANNEL" -> "The requested channel is invalid.";
            case "COURSE_MISMATCH" -> "You can only join channels for your own course.";
            case "NOT_ROOM_MEMBER" -> "You must be a member of this game room.";
            default -> "Channel access denied.";
        };
    }
}
