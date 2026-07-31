package com.survivalkit.backend.core.caffeine;

import com.survivalkit.backend.adapter.postgres.caffeine.CaffeineEntry;
import com.survivalkit.backend.adapter.postgres.caffeine.CaffeinePersistancePort;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.adapter.web.caffeine.CaffeineAddRequest;
import com.survivalkit.backend.context.SecurityContext;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.survivalkit.backend.context.SecurityContext.requireVerification;

@Service
public class CaffeineService implements CaffeinePort {

    private static final Set<String> PRESET_SOURCES = Set.of(
            "MONSTER", "REDBULL", "COFFEE", "TABLET", "OTHER"
    );

    private static final Map<String, Integer> PRESET_AMOUNTS = Map.of(
            "MONSTER", 180,
            "REDBULL", 105,
            "COFFEE", 90,
            "TABLET", 200
    );

    private static final Duration MAX_PAST = Duration.ofDays(7);
    private static final Duration MAX_FUTURE = Duration.ofHours(1);

    private final CaffeinePersistancePort caffeinePersistancePort;
    private final UserPersistancePort userPersistancePort;

    public CaffeineService(CaffeinePersistancePort caffeinePersistancePort, UserPersistancePort userPersistancePort) {
        this.caffeinePersistancePort = caffeinePersistancePort;
        this.userPersistancePort = userPersistancePort;
    }

    @Override
    public CaffeineEntry add(CaffeineAddRequest request) {
        requireVerification();
        var user = SecurityContext.current();

        if (request.source() == null || !PRESET_SOURCES.contains(request.source())) {
            throw new IllegalArgumentException(ErrorCode.CAFFEINE_SOURCE_INVALID.getCode());
        }

        int amountMg;
        if ("OTHER".equals(request.source())) {
            if (request.amountMg() == null || request.amountMg() < 1 || request.amountMg() > 1000) {
                throw new IllegalArgumentException(ErrorCode.CAFFEINE_AMOUNT_INVALID.getCode());
            }
            amountMg = request.amountMg();
        } else {
            amountMg = PRESET_AMOUNTS.get(request.source());
        }

        var consumedAt = request.consumedAt() != null ? request.consumedAt() : Instant.now();
        var now = Instant.now();
        if (consumedAt.isBefore(now.minus(MAX_PAST)) || consumedAt.isAfter(now.plus(MAX_FUTURE))) {
            throw new IllegalArgumentException(ErrorCode.CAFFEINE_TIMESTAMP_INVALID.getCode());
        }

        var entry = new CaffeineEntry(
                NanoId.generate(25),
                user.userId(),
                request.source(),
                amountMg,
                consumedAt
        );
        caffeinePersistancePort.save(entry);
        return entry;
    }

    @Override
    public void delete(String id) {
        requireVerification();
        var user = SecurityContext.current();
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException(ErrorCode.CAFFEINE_ENTRY_NOT_FOUND.getCode());
        }
        var deleted = caffeinePersistancePort.deleteForUser(id, user.userId());
        if (!deleted) {
            throw new IllegalArgumentException(ErrorCode.CAFFEINE_ENTRY_NOT_FOUND.getCode());
        }
    }

    @Override
    public List<CaffeineEntry> getToday() {
        var user = SecurityContext.current();
        return caffeinePersistancePort.getTodayForUser(user.userId());
    }

    @Override
    public List<CaffeineEntry> getLast7DaysForUser() {
        var user = SecurityContext.current();
        return caffeinePersistancePort.getLast7DaysForUser(user.userId());
    }

    @Override
    public List<CaffeineEntry> getLast7DaysForCourse() {
        var authUser = SecurityContext.current();
        var user = userPersistancePort.getById(authUser.userId());
        if (user.isEmpty()) {
            throw new IllegalStateException(ErrorCode.USER_DOES_NOT_EXIST.getCode());
        }
        if (user.get().course() == null) {
            return List.of();
        }
        return caffeinePersistancePort.getLast7DaysForCourse(user.get().course());
    }

    @Override
    public List<CaffeineEntry> getLast7DaysGlobal() {
        return caffeinePersistancePort.getLast7DaysGlobal();
    }

    @Override
    public double getAverageForUser() {
        var user = SecurityContext.current();
        return caffeinePersistancePort.getAverageForUser(user.userId()).orElse(0.0);
    }

    @Override
    public double getAverageForCourse() {
        var authUser = SecurityContext.current();
        var user = userPersistancePort.getById(authUser.userId());
        if (user.isEmpty()) {
            throw new IllegalStateException(ErrorCode.USER_DOES_NOT_EXIST.getCode());
        }
        if (user.get().course() == null) {
            return 0.0;
        }
        return caffeinePersistancePort.getAverageForCourse(user.get().course()).orElse(0.0);
    }

    @Override
    public double getAverageGlobal() {
        return caffeinePersistancePort.getAverageGlobal().orElse(0.0);
    }
}
