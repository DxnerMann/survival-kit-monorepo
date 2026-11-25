package com.survivalkit.backend.core.draw;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.adapter.postgres.draw.DrawBoardRepository;
import com.survivalkit.backend.adapter.postgres.user.UserModel;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.draw.DrawBoardResponse;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.user.AuthenticatedUser;
import com.survivalkit.backend.core.websocket.WebSocketPort;
import com.survivalkit.backend.shared.WebSocketChannels;
import com.survivalkit.backend.shared.WebSocketEnvelope;
import com.survivalkit.backend.shared.WebSocketMessageType;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class DrawBoardService {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    private static final Pattern STROKE_ID = Pattern.compile("^[A-Za-z0-9_-]{8,64}$");
    private static final Pattern COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final int MAX_POINTS = 250;

    private final DrawBoardRepository repository;
    private final UserPersistancePort users;
    private final WebSocketPort webSocketPort;
    private final ObjectMapper objectMapper;

    public DrawBoardService(
            DrawBoardRepository repository,
            UserPersistancePort users,
            @Lazy WebSocketPort webSocketPort,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.users = users;
        this.webSocketPort = webSocketPort;
        this.objectMapper = objectMapper;
    }

    public List<String> search(String query) {
        var cleaned = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        if (cleaned.length() < 2) {
            return List.of();
        }
        if (cleaned.length() > 32) {
            cleaned = cleaned.substring(0, 32);
        }
        var escaped = escapeLike(cleaned);
        return users.searchVerifiedUsernames("%" + escaped + "%", escaped + "%", SecurityContext.current().userId());
    }

    public DrawBoardResponse view(String partnerUsername) {
        return openBoard(partnerUsername, false);
    }

    public DrawBoardResponse announce(String partnerUsername) {
        return openBoard(partnerUsername, true);
    }

    public void unpair(String partnerUsername) {
        var self = SecurityContext.current();
        var partner = resolve(partnerUsername).orElse(null);
        if (partner == null || partner.id().equals(self.userId())) {
            return;
        }
        notify(partner.id(), "unpaired", self.username());
    }

    public DrawBoardResponse vote(String partnerUsername, boolean want) {
        var resolved = resolveMutual(partnerUsername);
        if (resolved.response() != null) {
            return resolved.response();
        }
        var result = repository.vote(resolved.low(), resolved.high(), today(), resolved.selfIsLow(), want);
        broadcast(result.row().id(), resetPayload(resolved.self().username(), want && !result.cleared(), result.cleared()));
        return toOpen(resolved, result.row());
    }

    public boolean commitStroke(String partnerUsername, DrawBoardResponse.Stroke incoming) {
        var resolved = resolveMutual(partnerUsername);
        if (resolved.response() != null || incoming == null) {
            return false;
        }
        var stroke = parseStroke(incoming.id(), incoming.tool(), incoming.color(), incoming.width(), incoming.points(), resolved.self().userId());
        if (stroke.isEmpty()) {
            return false;
        }
        var written = repository.upsert(resolved.low(), resolved.high(), today(), stroke.get());
        written.ifPresent(value -> broadcast(value.boardId(), strokePayload(value.stroke())));
        return written.isPresent();
    }

    public Optional<String> handleStrokeMessage(String userId, String channel, JsonNode payload) {
        var parsed = WebSocketChannels.parse(channel);
        if (parsed.isEmpty() || parsed.get().kind() != WebSocketChannels.ChannelKind.DRAW) {
            return Optional.of("INVALID_CHANNEL");
        }
        var boardId = parsed.get().lobbyId();
        if (!canJoin(userId, boardId)) {
            return Optional.of("NOT_DRAW_MEMBER");
        }
        var board = repository.findById(boardId).orElse(null);
        if (board == null) {
            return Optional.of("NOT_DRAW_MEMBER");
        }
        var strokeNode = payload == null ? null : payload.get("stroke");
        if (strokeNode == null || !strokeNode.isObject() || !"stroke".equals(text(payload, "action"))) {
            return Optional.of("INVALID_DRAW");
        }
        var points = readPoints(strokeNode.get("points"));
        var stroke = parseStroke(
                text(strokeNode, "id"),
                text(strokeNode, "tool"),
                text(strokeNode, "color"),
                strokeNode.path("width").asDouble(Double.NaN),
                points,
                userId
        );
        if (stroke.isEmpty()) {
            return Optional.of("INVALID_DRAW");
        }
        var written = repository.upsert(board.userLow(), board.userHigh(), today(), stroke.get());
        if (written.isEmpty()) {
            return Optional.of("INVALID_DRAW");
        }
        broadcast(written.get().boardId(), strokePayload(written.get().stroke()));
        return Optional.empty();
    }

    public boolean canJoin(String userId, String boardId) {
        if (userId == null || boardId == null || boardId.isBlank()) {
            return false;
        }
        var row = repository.findById(boardId).orElse(null);
        if (row == null || (!userId.equals(row.userLow()) && !userId.equals(row.userHigh()))) {
            return false;
        }
        if (row.userLow().equals(row.userHigh())) {
            return true;
        }
        var low = users.getById(row.userLow()).orElse(null);
        var high = users.getById(row.userHigh()).orElse(null);
        if (low == null || high == null) {
            return false;
        }
        return selects(low.id(), high.username()) && selects(high.id(), low.username());
    }

    private DrawBoardResponse openBoard(String partnerUsername, boolean notifyPartner) {
        var resolved = resolveMutual(partnerUsername);
        if (resolved.response() != null) {
            return resolved.response();
        }
        var locked = repository.ensure(resolved.low(), resolved.high(), today());
        if (notifyPartner && !resolved.solo()) {
            notify(resolved.partner().id(), "paired", resolved.self().username());
        }
        return toOpen(resolved, locked.row());
    }

    private Resolved resolveMutual(String partnerUsername) {
        var self = SecurityContext.current();
        var requested = partnerUsername == null ? "" : partnerUsername.trim();
        if (requested.isBlank()) {
            return solo(self);
        }
        var partner = resolve(requested).orElse(null);
        if (partner == null || partner.username() == null || partner.username().isBlank()) {
            return Resolved.done(closed("unknown", requested));
        }
        if (partner.id().equals(self.userId())) {
            return solo(self);
        }
        if (!selects(self.userId(), partner.username()) || !selects(partner.id(), self.username())) {
            return Resolved.done(closed("waiting", partner.username()));
        }
        var selfIsLow = self.userId().compareTo(partner.id()) < 0;
        var low = selfIsLow ? self.userId() : partner.id();
        var high = selfIsLow ? partner.id() : self.userId();
        return new Resolved(self, partner, low, high, selfIsLow, null);
    }

    private Optional<UserModel> resolve(String username) {
        if (username == null || username.isBlank()) {
            return Optional.empty();
        }
        var exact = users.findByUsername(username.trim());
        if (exact.isPresent()) {
            return exact;
        }
        var matches = users.findUsersByUsernameIgnoreCase(username.trim());
        if (matches.size() == 1) {
            return Optional.of(matches.getFirst());
        }
        return Optional.empty();
    }

    private boolean selects(String userId, String username) {
        if (userId == null || username == null || username.isBlank()) {
            return false;
        }
        for (var data : repository.widgetData(userId)) {
            if (data == null || data.isBlank()) {
                continue;
            }
            try {
                var chosen = objectMapper.readTree(data).path("partnerUsername").asText("");
                if (username.equalsIgnoreCase(chosen.trim())) {
                    return true;
                }
            } catch (Exception ignored) {
            }
        }
        return false;
    }

    private Resolved solo(AuthenticatedUser self) {
        var user = users.getById(self.userId()).orElse(null);
        if (user == null) {
            return Resolved.done(DrawBoardResponse.idle());
        }
        return new Resolved(self, user, self.userId(), self.userId(), true, null);
    }

    private DrawBoardResponse toOpen(Resolved resolved, DrawBoardRepository.Row row) {
        var selfIsLow = resolved.self().userId().equals(row.userLow());
        var strokes = repository.readStrokes(row.strokes()).stream()
                .map(this::publish)
                .flatMap(Optional::stream)
                .toList();
        return new DrawBoardResponse(
                "open",
                resolved.solo() ? "" : resolved.partner().username(),
                WebSocketChannels.drawBoard(row.id()),
                strokes,
                selfIsLow ? row.resetLow() : row.resetHigh(),
                resolved.solo() ? false : (selfIsLow ? row.resetHigh() : row.resetLow())
        );
    }

    private DrawBoardResponse closed(String status, String partnerUsername) {
        return new DrawBoardResponse(status, partnerUsername, null, List.of(), false, false);
    }

    private Optional<DrawStroke> parseStroke(
            String id,
            String tool,
            String color,
            double width,
            List<List<Double>> points,
            String authorId
    ) {
        if (id == null || !STROKE_ID.matcher(id).matches()) {
            return Optional.empty();
        }
        if (!"pen".equals(tool) && !"eraser".equals(tool)) {
            return Optional.empty();
        }
        if (!Double.isFinite(width) || width < 0.003 || width > 0.08) {
            return Optional.empty();
        }
        if (points == null || points.isEmpty() || points.size() > MAX_POINTS) {
            return Optional.empty();
        }
        var normalized = new ArrayList<List<Double>>(points.size());
        for (var point : points) {
            if (point == null || point.size() != 2 || point.get(0) == null || point.get(1) == null) {
                return Optional.empty();
            }
            var x = point.get(0);
            var y = point.get(1);
            if (!Double.isFinite(x) || !Double.isFinite(y)) {
                return Optional.empty();
            }
            normalized.add(List.of(roundUnit(x), roundUnit(y)));
        }
        var ink = "eraser".equals(tool) || color == null || !COLOR.matcher(color).matches()
                ? "#000000"
                : color.toLowerCase(Locale.ROOT);
        return Optional.of(new DrawStroke(id, authorId, tool, ink, Math.round(width * 10000d) / 10000d, normalized));
    }

    private List<List<Double>> readPoints(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        var points = new ArrayList<List<Double>>();
        for (var point : node) {
            if (!point.isArray() || point.size() != 2) {
                return List.of();
            }
            points.add(List.of(point.get(0).asDouble(), point.get(1).asDouble()));
        }
        return points;
    }

    private Optional<DrawBoardResponse.Stroke> publish(DrawStroke stroke) {
        if (stroke == null || stroke.id() == null || stroke.points() == null || stroke.points().isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new DrawBoardResponse.Stroke(
                stroke.id(),
                stroke.tool(),
                stroke.color(),
                stroke.width(),
                stroke.points()
        ));
    }

    private void broadcast(String boardId, JsonNode payload) {
        webSocketPort.broadcastToChannel(
                WebSocketChannels.drawBoard(boardId),
                WebSocketEnvelope.of(WebSocketMessageType.MESSAGE, WebSocketChannels.drawBoard(boardId), payload)
        );
    }

    private void notify(String userId, String action, String withUsername) {
        var payload = objectMapper.createObjectNode();
        payload.put("action", action);
        payload.put("withUsername", withUsername == null ? "" : withUsername);
        webSocketPort.sendToUser(userId, WebSocketEnvelope.of(WebSocketMessageType.MESSAGE, payload));
    }

    private JsonNode strokePayload(DrawStroke stroke) {
        var payload = objectMapper.createObjectNode();
        payload.put("action", "stroke");
        publish(stroke).ifPresent(published -> payload.set("stroke", objectMapper.valueToTree(published)));
        return payload;
    }

    private JsonNode resetPayload(String voterUsername, boolean want, boolean cleared) {
        var payload = objectMapper.createObjectNode();
        payload.put("action", "reset");
        payload.put("voterUsername", voterUsername == null ? "" : voterUsername);
        payload.put("want", want);
        payload.put("cleared", cleared);
        return payload;
    }

    private String text(JsonNode node, String field) {
        if (node == null) {
            return "";
        }
        return node.path(field).asText("");
    }

    private double roundUnit(double value) {
        var clamped = Math.max(0, Math.min(1, value));
        return Math.round(clamped * 10000d) / 10000d;
    }

    private String escapeLike(String value) {
        return value.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    private String today() {
        return LocalDate.now(BERLIN).toString();
    }

    private record Resolved(
            AuthenticatedUser self,
            UserModel partner,
            String low,
            String high,
            boolean selfIsLow,
            DrawBoardResponse response
    ) {
        private boolean solo() {
            return low != null && low.equals(high);
        }

        private static Resolved done(DrawBoardResponse response) {
            return new Resolved(null, null, null, null, false, response);
        }
    }
}
