package com.survivalkit.backend.core.websocket;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGamePersistancePort;
import com.survivalkit.backend.shared.WebSocketChannels;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CourseChannelAccessValidatorImpl implements CourseChannelAccessValidator {

    private final PresentationGamePersistancePort presentationGamePersistancePort;

    public CourseChannelAccessValidatorImpl(PresentationGamePersistancePort presentationGamePersistancePort) {
        this.presentationGamePersistancePort = presentationGamePersistancePort;
    }

    @Override
    public Optional<String> validateJoin(WebSocketUserContextView user, String channel) {
        var parsedChannel = WebSocketChannels.parse(channel);
        if (parsedChannel.isEmpty()) {
            return Optional.of("INVALID_CHANNEL");
        }

        if (parsedChannel.get().kind() == WebSocketChannels.ChannelKind.PRESENTATION_GAME) {
            var roomId = parsedChannel.get().lobbyId();
            if (roomId == null || roomId.isBlank()) {
                return Optional.of("INVALID_CHANNEL");
            }
            if (!presentationGamePersistancePort.isMember(roomId, user.userId())) {
                return Optional.of("NOT_ROOM_MEMBER");
            }
            return Optional.empty();
        }

        if (user.course() == null || user.course().isBlank()) {
            return Optional.of("NO_COURSE_SET");
        }

        if (parsedChannel.get().course() == null || !parsedChannel.get().course().equals(user.course())) {
            return Optional.of("COURSE_MISMATCH");
        }

        return Optional.empty();
    }
}
