package com.survivalkit.backend.core.caffeine;

import com.survivalkit.backend.adapter.postgres.caffeine.CaffeineEntry;
import com.survivalkit.backend.adapter.web.caffeine.CaffeineAddRequest;

import java.util.List;

public interface CaffeinePort {
    CaffeineEntry add(CaffeineAddRequest request);
    void delete(String id);
    List<CaffeineEntry> getToday();
    List<CaffeineEntry> getLast7DaysForUser();
    List<CaffeineEntry> getLast7DaysForCourse();
    List<CaffeineEntry> getLast7DaysGlobal();
    double getAverageForUser();
    double getAverageForCourse();
    double getAverageGlobal();
}
