package com.survivalkit.backend.adapter.postgres.course;

import java.util.List;
import java.util.Optional;

public interface CoursePersistancePort {

    void save(String course, String raplaBaseUrl);
    Optional<String> getRaplaUrl(String course);
    List<String> getAvailableCourses();
}
