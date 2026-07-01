package com.survivalkit.backend.core.course;

import java.util.List;

public interface CoursePort {

    List<String> getAvailableCourses();
    String extract(String raplaUrl);
}
