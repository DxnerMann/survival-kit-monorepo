package com.survivalkit.backend.core.daily;

import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

@Service
public interface DailyEventPort {

    byte[] getTodaysCatImage();
    void newCatImage();
}
