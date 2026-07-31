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
    boolean deleteForUser(String id, String userId);
    void deleteOlderThan7Days();
}
