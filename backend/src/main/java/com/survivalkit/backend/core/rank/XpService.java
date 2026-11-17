package com.survivalkit.backend.core.rank;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.adapter.postgres.rank.XpRepository;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.activity.ActivityPort;
import com.survivalkit.backend.core.websocket.WebSocketPort;
import com.survivalkit.backend.shared.WebSocketEnvelope;
import com.survivalkit.backend.shared.WebSocketMessageType;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;

@Service
public class XpService implements XpPort {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

    private final XpRepository xpRepository;
    private final ActivityPort activityPort;
    private final WebSocketPort webSocketPort;
    private final ObjectMapper objectMapper;

    public XpService(
            XpRepository xpRepository,
            ActivityPort activityPort,
            @Lazy WebSocketPort webSocketPort,
            ObjectMapper objectMapper
    ) {
        this.xpRepository = xpRepository;
        this.activityPort = activityPort;
        this.webSocketPort = webSocketPort;
        this.objectMapper = objectMapper;
    }

    @Override
    public void award(String userId, XpRules.Action action) {
        if (userId == null || userId.isBlank() || action == null) {
            return;
        }
        var day = LocalDate.now(BERLIN).toString();
        var grant = xpRepository.grant(userId, action.name(), day, action.xp(), action.dailyCap());
        if (grant.isEmpty()) {
            return;
        }
        var before = XpRules.Rank.forXp(grant.get().previousXp());
        var after = XpRules.Rank.forXp(grant.get().xp());
        if (before == after) {
            return;
        }
        var activity = activityPort.recordRankUp(userId, after.label());
        webSocketPort.sendToUser(
                userId,
                WebSocketEnvelope.of(
                        WebSocketMessageType.ACTIVITY,
                        objectMapper.createObjectNode()
                                .put("kind", "RANK_UP")
                                .put("id", activity.id())
                )
        );
    }

    @Override
    public UserRankView mine() {
        var user = SecurityContext.current();
        return findByUsers(List.of(user.userId())).stream()
                .findFirst()
                .orElseGet(() -> UserRankView.of(user.userId(), user.username(), 0));
    }

    @Override
    public List<UserRankView> leaderboard(int limit) {
        var size = Math.max(1, Math.min(limit, 20));
        return xpRepository.leaderboard(size).stream()
                .map(row -> UserRankView.of(row.userId(), row.username(), row.xp()))
                .toList();
    }

    @Override
    public List<UserRankView> findByUsers(Collection<String> userIds) {
        return xpRepository.findByUsers(userIds).stream()
                .map(row -> UserRankView.of(row.userId(), row.username(), row.xp()))
                .toList();
    }
}
