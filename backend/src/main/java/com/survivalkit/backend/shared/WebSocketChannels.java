package com.survivalkit.backend.shared;

import java.util.Optional;
import java.util.regex.Pattern;

public final class WebSocketChannels {

    private static final Pattern COURSE_CHAT = Pattern.compile("^course:([^:]+):chat$");
    private static final Pattern COURSE_GAME = Pattern.compile("^course:([^:]+):game:([^:]+)$");
    private static final Pattern PRESENTATION_GAME = Pattern.compile("^presentation-game:([^:]+)$");

    private WebSocketChannels() {}

    public static String courseChat(String course) {
        return "course:" + sanitize(course) + ":chat";
    }

    public static String courseGameLobby(String course, String lobbyId) {
        return "course:" + sanitize(course) + ":game:" + sanitize(lobbyId);
    }

    public static String presentationGameRoom(String roomId) {
        return "presentation-game:" + sanitize(roomId);
    }

    public static Optional<ParsedChannel> parse(String channel) {
        if (channel == null || channel.isBlank()) {
            return Optional.empty();
        }

        var chatMatcher = COURSE_CHAT.matcher(channel);
        if (chatMatcher.matches()) {
            return Optional.of(new ParsedChannel(chatMatcher.group(1), ChannelKind.CHAT, null));
        }

        var gameMatcher = COURSE_GAME.matcher(channel);
        if (gameMatcher.matches()) {
            return Optional.of(new ParsedChannel(gameMatcher.group(1), ChannelKind.GAME_LOBBY, gameMatcher.group(2)));
        }

        var presentationMatcher = PRESENTATION_GAME.matcher(channel);
        if (presentationMatcher.matches()) {
            return Optional.of(new ParsedChannel(null, ChannelKind.PRESENTATION_GAME, presentationMatcher.group(1)));
        }

        return Optional.empty();
    }

    private static String sanitize(String value) {
        return value.trim();
    }

    public enum ChannelKind {
        CHAT,
        GAME_LOBBY,
        PRESENTATION_GAME
    }

    public record ParsedChannel(
            String course,
            ChannelKind kind,
            String lobbyId
    ) {}
}
