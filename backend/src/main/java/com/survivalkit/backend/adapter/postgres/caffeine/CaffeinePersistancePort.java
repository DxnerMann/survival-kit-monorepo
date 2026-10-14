package com.survivalkit.backend.adapter.postgres.caffeine;

import java.util.List;
import java.util.Optional;

public interface CaffeinePersistancePort {
    void save(CaffeineEntry entry);
    List<CaffeineEntry> getTodayForUser(String userId);
    List<CaffeineEntry> getLast7DaysForUser(String userId);
    List<CaffeineEntry> getLast7DaysForCourse(String course);
    List<CaffeineEntry> getLast7DaysGlobal();
    Optional<Double> getAverageForUser(String userId);
    Optional<Double> getAverageForCourse(String course);
    Optional<Double> getAverageGlobal();
    Optional<Double> getSumForUser(String userId);
    Optional<Double> getSumForCourse(String course);
    Optional<Double> getSumGlobal();
    boolean deleteForUser(String id, String userId);
    void deleteOlderThan7Days();
    List<CaffeinePreset> getPresetsForUser(String userId);
    void insertPreset(CaffeinePreset preset, String userId);
    boolean updatePresetForUser(CaffeinePreset preset, String userId);
    boolean deletePresetForUser(String id, String userId);
}
