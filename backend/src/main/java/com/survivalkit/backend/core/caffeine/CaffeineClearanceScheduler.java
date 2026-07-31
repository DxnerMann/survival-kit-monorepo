package com.survivalkit.backend.core.caffeine;

import com.survivalkit.backend.adapter.postgres.caffeine.CaffeinePersistancePort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class CaffeineClearanceScheduler {

    private final CaffeinePersistancePort caffeinePersistancePort;

    public CaffeineClearanceScheduler(CaffeinePersistancePort caffeinePersistancePort) {
        this.caffeinePersistancePort = caffeinePersistancePort;
    }

    @Scheduled(cron = "0 0 * * * *", zone = "Europe/Berlin")
    public void deleteOldEntries() {
        caffeinePersistancePort.deleteOlderThan7Days();
    }
}
