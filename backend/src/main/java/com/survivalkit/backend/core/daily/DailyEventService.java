package com.survivalkit.backend.core.daily;

import com.survivalkit.backend.adapter.catasaservice.CatAASPort;
import org.springframework.stereotype.Service;

@Service
public class DailyEventService implements DailyEventPort {

    private final CatAASPort catAASPort;

    private byte[] todaysCatImage;

    public DailyEventService(CatAASPort catAASPort) {
        this.catAASPort = catAASPort;
    }

    @Override
    public byte[] getTodaysCatImage() {
        if (todaysCatImage != null) {
            return todaysCatImage;
        }
        newCatImage();
        return todaysCatImage;
    }

    @Override
    public void newCatImage() {
        todaysCatImage = catAASPort.getRandomCatImage(500, 500);
    }
}
