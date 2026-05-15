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
    public void setCourseForUser(String course, String raplaUrl) {
        if (!course.isEmpty()) {
            var userId = SecurityContext.current().userId();
            userPersistancePort.setUserCourse(userId, course);
            return;
        }
        if (!raplaUrl.isEmpty()) {
            var extractedCourse = raplaApiPort.extractCourse(raplaApiPort.formatToBaseUrl(raplaUrl));
            coursePersistancePort.save(extractedCourse, raplaApiPort.formatToBaseUrl(raplaUrl));
            userPersistancePort.setUserCourse(extractedCourse, course);
            return;
        }
        throw new IllegalArgumentException("course and raplaUrl cannot be both empty");
    }

    @Override
    public List<String> getAvailableCourses() {
        return coursePersistancePort.getAvailableCourses();
    }

    @Override
    public String getUserCourseOrExtract(String raplaUrl) {
        if (raplaUrl == null || raplaUrl.isEmpty()) {
            var userId = SecurityContext.current().userId();
            var user = userPersistancePort.getById(userId);
            if (user.isPresent()) {
                return user.get().course();
            }
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        } else {
            var extractedCourse = raplaApiPort.extractCourse(raplaApiPort.formatToBaseUrl(raplaUrl));
            coursePersistancePort.save(extractedCourse, raplaApiPort.formatToBaseUrl(raplaUrl));
            return extractedCourse;
        }
    }
}
