package com.survivalkit.backend.adapter.postgres.course;

import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class CourseRepository implements CoursePersistancePort {
    @Override
    public void save(String course, String raplaBaseUrl) {
        //TODO
        // ON CONFLICT DO NOTHING
    }

    @Override
    public String getRaplaUrl(String course) {
        //TODO
        return "";
    }

    @Override
    public List<String> getAvailableCourses() {
        //TODO
        return List.of();
    }
}
