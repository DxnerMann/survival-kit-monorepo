package com.survivalkit.backend.core.daily;

import com.survivalkit.backend.adapter.catasaservice.CatAASPort;
import com.survivalkit.backend.adapter.web.ErrorCode;
import org.springframework.stereotype.Service;

@Service
public class DailyEventService implements DailyEventPort {

    private final CatAASPort catAASPort;

    private byte[] todaysCatImage;
    private boolean catFetchFailed;

    public DailyEventService(CatAASPort catAASPort) {
        this.catAASPort = catAASPort;
    }

    @Override
    public byte[] getTodaysCatImage() {
        if (todaysCatImage != null) {
            return todaysCatImage;
        }
        if (catFetchFailed) {
            throw new RuntimeException(ErrorCode.CATAAS_REQUEST_FAILED.getCode());
        }
        newCatImage();
        return todaysCatImage;
    }

    @Override
    public void newCatImage() {
        catFetchFailed = false;
        try {
            todaysCatImage = catAASPort.getRandomCatImage(500, 500);
        } catch (RuntimeException e) {
            todaysCatImage = null;
            catFetchFailed = true;
            throw e;
        }
    }
}
