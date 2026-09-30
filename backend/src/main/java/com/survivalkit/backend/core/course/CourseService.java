package com.survivalkit.backend.core.course;

import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.rapla.RaplaApiPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CourseService implements CoursePort {

    private final RaplaApiPort raplaApiPort;
    private final CoursePersistancePort coursePersistancePort;

    public CourseService(
            RaplaApiPort raplaApiPort,
            CoursePersistancePort coursePersistancePort
    ) {
        this.raplaApiPort = raplaApiPort;
        this.coursePersistancePort = coursePersistancePort;
    }

    @Override
    public List<String> getAvailableCourses() {
        return coursePersistancePort.getAvailableCourses();
    }

    @Override
    public String extract(String raplaUrl) {
        var baseUrl = raplaApiPort.formatToBaseUrl(raplaUrl);
        var extractedCourse = raplaApiPort.extractCourse(baseUrl);
        coursePersistancePort.saveRaplaUrl(extractedCourse, baseUrl);
        return extractedCourse;
    }
}
