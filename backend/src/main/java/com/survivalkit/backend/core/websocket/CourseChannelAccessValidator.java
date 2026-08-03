package com.survivalkit.backend.core.websocket;

import java.util.Optional;

public interface CourseChannelAccessValidator {

    Optional<String> validateJoin(WebSocketUserContextView user, String channel);
}
