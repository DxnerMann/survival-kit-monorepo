package com.survivalkit.backend.core.daily;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class DailyEventScheduler {

    private final DailyEventPort dailyEventPort;

    public DailyEventScheduler(DailyEventPort dailyEventPort) {
        this.dailyEventPort = dailyEventPort;
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "Europe/Berlin")
    private void newCatImage() {
        dailyEventPort.newCatImage();
    }
}
