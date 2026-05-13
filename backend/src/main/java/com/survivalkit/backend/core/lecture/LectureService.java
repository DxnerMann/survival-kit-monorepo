package com.survivalkit.backend.core.lecture;

import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.rapla.RaplaApiPort;
import com.survivalkit.backend.shared.Lecture;
import org.springframework.stereotype.Service;

import java.util.List;

import static com.survivalkit.backend.shared.Utils.formatToBaseUrl;

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
        if (!course.isEmpty()) {
            return raplaApiPort.getLectures(weekOffset, course);
        }
        if (!raplaUrl.isEmpty()) {
            var extractedCourse = raplaApiPort.extractCourse(raplaUrl);
            coursePersistancePort.save(extractedCourse, formatToBaseUrl(raplaUrl));
            return raplaApiPort.getLectures(weekOffset, extractedCourse);
        }
        throw new IllegalArgumentException("course and raplaUrl cannot be both empty");
    }
}
