package com.survivalkit.backend.adapter.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketSessionRegistry {

    private final Map<String, WebSocketSession> sessionsById = new ConcurrentHashMap<>();
    private final Map<String, WebSocketUserContext> usersBySessionId = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> sessionIdsByChannel = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> channelIdsBySession = new ConcurrentHashMap<>();

    public void register(WebSocketSession session, WebSocketUserContext user) {
        sessionsById.put(session.getId(), session);
        usersBySessionId.put(session.getId(), user);
    }

    public void unregister(String sessionId) {
        var channels = channelIdsBySession.remove(sessionId);
        if (channels != null) {
            for (var channel : channels) {
                leave(sessionId, channel);
            }
        }
        sessionsById.remove(sessionId);
        usersBySessionId.remove(sessionId);
    }

    public void join(String sessionId, String channel) {
        sessionIdsByChannel.computeIfAbsent(channel, ignored -> ConcurrentHashMap.newKeySet()).add(sessionId);
        channelIdsBySession.computeIfAbsent(sessionId, ignored -> ConcurrentHashMap.newKeySet()).add(channel);
    }

    public void leave(String sessionId, String channel) {
        var sessionIds = sessionIdsByChannel.get(channel);
        if (sessionIds != null) {
            sessionIds.remove(sessionId);
            if (sessionIds.isEmpty()) {
                sessionIdsByChannel.remove(channel);
            }
        }

        var channels = channelIdsBySession.get(sessionId);
        if (channels != null) {
            channels.remove(channel);
            if (channels.isEmpty()) {
                channelIdsBySession.remove(sessionId);
            }
        }
    }

    public Collection<WebSocketSession> getSessionsInChannel(String channel) {
        var sessionIds = sessionIdsByChannel.get(channel);
        if (sessionIds == null || sessionIds.isEmpty()) {
            return Set.of();
        }

        return sessionIds.stream()
                .map(sessionsById::get)
                .filter(session -> session != null && session.isOpen())
                .toList();
    }

    public Optional<WebSocketSession> getSession(String sessionId) {
        return Optional.ofNullable(sessionsById.get(sessionId));
    }

    public Optional<WebSocketUserContext> getUser(String sessionId) {
        return Optional.ofNullable(usersBySessionId.get(sessionId));
    }

    public boolean isInChannel(String sessionId, String channel) {
        var channels = channelIdsBySession.get(sessionId);
        return channels != null && channels.contains(channel);
    }

    public Collection<WebSocketSession> getSessionsForUser(String userId) {
        return usersBySessionId.entrySet().stream()
                .filter(entry -> userId.equals(entry.getValue().userId()))
                .map(entry -> sessionsById.get(entry.getKey()))
                .filter(session -> session != null && session.isOpen())
                .toList();
    }
}
