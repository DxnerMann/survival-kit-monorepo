package com.survivalkit.backend.core.course;

import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.rapla.RaplaApiPort;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.config.SecurityContext;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CourseService implements CoursePort {

    private final UserPersistancePort userPersistancePort;
    private final RaplaApiPort raplaApiPort;
    private final CoursePersistancePort coursePersistancePort;

    public CourseService(UserPersistancePort userPersistancePort, RaplaApiPort raplaApiPort, CoursePersistancePort coursePersistancePort) {
        this.userPersistancePort = userPersistancePort;
        this.raplaApiPort = raplaApiPort;
        this.coursePersistancePort = coursePersistancePort;
    }

    @Override
    public List<String> getAvailableCourses() {
        return coursePersistancePort.getAvailableCourses();
    }

    @Override
    public String extract(String raplaUrl) {
        var extractedCourse = raplaApiPort.extractCourse(raplaApiPort.formatToBaseUrl(raplaUrl));
        coursePersistancePort.save(extractedCourse, raplaApiPort.formatToBaseUrl(raplaUrl));
        return extractedCourse;
    }
}
