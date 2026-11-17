package com.survivalkit.backend.core.qucklink;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class QuickLinkClickResetScheduler {

    private final QuickLinkPort quickLinkPort;

    public QuickLinkClickResetScheduler(QuickLinkPort quickLinkPort) {
        this.quickLinkPort = quickLinkPort;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void resetOnStartup() {
        quickLinkPort.ensureMonthlyClickReset();
    }

    @Scheduled(cron = "0 5 0 * * *", zone = "Europe/Berlin")
    public void resetOvernight() {
        quickLinkPort.ensureMonthlyClickReset();
    }
}
