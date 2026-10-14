package com.survivalkit.backend.core.caffeine;

import com.survivalkit.backend.adapter.postgres.caffeine.CaffeineEntry;
import com.survivalkit.backend.adapter.postgres.caffeine.CaffeinePreset;
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
    double getSumForUser();
    double getSumForCourse();
    double getSumGlobal();
    List<CaffeinePreset> getPresets();
    CaffeinePreset savePreset(String name, int amountMg);
    CaffeinePreset updatePreset(String id, String name, int amountMg);
    void deletePreset(String id);
}
