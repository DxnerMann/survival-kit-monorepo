package com.survivalkit.backend.adapter.postgres.calendar;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CustomEventPersistancePort {

    void save(StoredCustomEvent event, Instant createdAt);

    void saveInvite(CustomEventInvite invite, Instant createdAt);

    List<StoredCustomEvent> findVisible(String userId);

    Optional<CustomEventInvite> findInvite(String eventId, String userId);

    int markInvite(String eventId, String userId, String status);
}
