package com.survivalkit.backend.adapter.postgres.course;

import java.util.List;

public interface CoursePersistancePort {

    void save(String course, String raplaBaseUrl);
    String getRaplaUrl(String course);
    List<String> getAvailableCourses();
}
