package com.survivalkit.backend.shared;

import com.fasterxml.jackson.databind.JsonNode;

public record WebSocketEnvelope(
        String type,
        String channel,
        JsonNode payload
) {
    public static WebSocketEnvelope of(String type, String channel, JsonNode payload) {
        return new WebSocketEnvelope(type, channel, payload);
    }

    public static WebSocketEnvelope of(String type, JsonNode payload) {
        return new WebSocketEnvelope(type, null, payload);
    }
}
