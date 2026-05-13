package com.survivalkit.backend.core.course;

import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.rapla.RaplaApiPort;
import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.config.SecurityContext;
import org.springframework.stereotype.Service;

import java.util.List;

import static com.survivalkit.backend.shared.Utils.formatToBaseUrl;

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
            var extractedCourse = raplaApiPort.extractCourse(raplaUrl);
            coursePersistancePort.save(extractedCourse, formatToBaseUrl(raplaUrl));
            userPersistancePort.setUserCourse(extractedCourse, course);
            return;
        }
        throw new IllegalArgumentException("course and raplaUrl cannot be both empty");
    }

    @Override
    public List<String> getAvailableCourses() {
        return coursePersistancePort.getAvailableCourses();
    }
}
