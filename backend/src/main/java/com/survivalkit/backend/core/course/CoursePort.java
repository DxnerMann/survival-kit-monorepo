package com.survivalkit.backend.core.course;

import java.util.List;

public interface CoursePort {

    void setCourseForUser(String course, String raplaUrl);
    List<String> getAvailableCourses();
    String getUserCourseOrExtract(String raplaUrl);
}
