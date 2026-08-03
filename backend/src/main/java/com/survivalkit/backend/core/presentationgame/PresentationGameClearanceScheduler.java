package com.survivalkit.backend.core.presentationgame;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGamePersistancePort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class PresentationGameClearanceScheduler {

    private final PresentationGamePersistancePort persistancePort;

    public PresentationGameClearanceScheduler(PresentationGamePersistancePort persistancePort) {
        this.persistancePort = persistancePort;
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "Europe/Berlin")
    public void deleteAllRoomsAtMidnight() {
        persistancePort.deleteAllRooms();
    }
}
