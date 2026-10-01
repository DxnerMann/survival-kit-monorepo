package com.survivalkit.backend.core.guest;

import com.survivalkit.backend.adapter.postgres.guest.GuestPersistancePort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class GuestClearanceScheduler {

    private final GuestPersistancePort guestPersistancePort;

    public GuestClearanceScheduler(GuestPersistancePort guestPersistancePort) {
        this.guestPersistancePort = guestPersistancePort;
    }

    @Scheduled(cron = "0 */5 * * * *", zone = "Europe/Berlin")
    public void deleteInactiveGuests() {
        guestPersistancePort.deleteInactive();
    }
}
