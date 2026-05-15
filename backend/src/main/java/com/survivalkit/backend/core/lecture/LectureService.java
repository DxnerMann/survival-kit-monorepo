package com.survivalkit.backend.core.lecture;

import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.rapla.RaplaApiPort;
import com.survivalkit.backend.core.course.CourseNotFoundException;
import com.survivalkit.backend.shared.Lecture;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LectureService implements LecturePort {

    private final RaplaApiPort raplaApiPort;
    private final CoursePersistancePort coursePersistancePort;

    public LectureService(RaplaApiPort raplaApiPort, CoursePersistancePort coursePersistancePort) {
        this.raplaApiPort = raplaApiPort;
        this.coursePersistancePort = coursePersistancePort;
    }

    @Override
    public List<Lecture> getLecturesForWeek(int weekOffset, String course, String raplaUrl) {
        if (course != null && !course.isEmpty()) {
            var raplaCourseBaseUrl = coursePersistancePort.getRaplaUrl(course);
            if (raplaCourseBaseUrl.isPresent()) {
                return raplaApiPort.getLectures(weekOffset, raplaCourseBaseUrl.get());
            } else if(raplaUrl == null || raplaUrl.isEmpty()) {
                throw new CourseNotFoundException(course);
            }
        }
        if (raplaUrl != null && !raplaUrl.isEmpty()) {
            var baseUrl = raplaApiPort.formatToBaseUrl(raplaUrl);
            var extractedCourse = raplaApiPort.extractCourse(baseUrl);
            coursePersistancePort.save(extractedCourse, baseUrl);
            return raplaApiPort.getLectures(weekOffset, baseUrl);
        }
        throw new IllegalArgumentException("course and raplaUrl cannot be both empty");
    }

    @Override
    public List<String> getLectureNamesForSemester(String course) {
        var raplaCourseBaseUrl = coursePersistancePort.getRaplaUrl(course);
        if (raplaCourseBaseUrl.isPresent()) {
            return raplaApiPort.getLectureNamesForSemester(raplaCourseBaseUrl.get());
        }
        throw new CourseNotFoundException(course);
    }
}
