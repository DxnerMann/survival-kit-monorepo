package com.survivalkit.backend.adapter.postgres.course;

import java.util.List;
import java.util.Optional;

public interface CoursePersistancePort {

    void saveRaplaUrl(String course, String raplaBaseUrl, String raplaVersion);

    Optional<CourseRaplaConfig> getCourseRaplaConfig(String course);

    List<String> getAvailableCourses();
}
