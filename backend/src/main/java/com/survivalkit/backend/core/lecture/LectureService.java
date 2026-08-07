package com.survivalkit.backend.core.lecture;

import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.rapla.RaplaAdapterRegistry;
import com.survivalkit.backend.adapter.rapla.RaplaApiPort;
import com.survivalkit.backend.adapter.rapla.RaplaUrlResolver;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.core.course.CourseNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LectureService implements LecturePort {

    private final RaplaApiPort raplaApiPort;
    private final CoursePersistancePort coursePersistancePort;
    private final RaplaUrlResolver raplaUrlResolver;
    private final RaplaAdapterRegistry adapterRegistry;

    public LectureService(
            RaplaApiPort raplaApiPort,
            CoursePersistancePort coursePersistancePort,
            RaplaUrlResolver raplaUrlResolver,
            RaplaAdapterRegistry adapterRegistry
    ) {
        this.raplaApiPort = raplaApiPort;
        this.coursePersistancePort = coursePersistancePort;
        this.raplaUrlResolver = raplaUrlResolver;
        this.adapterRegistry = adapterRegistry;
    }

    @Override
    public LecturePlanResult getLecturesForWeek(int weekOffset, String course, String raplaUrl) {
        var resolved = resolveRaplaUrl(course, raplaUrl);
        var lectures = raplaApiPort.getLectures(weekOffset, resolved.url());
        return new LecturePlanResult(lectures, resolved.notice().orElse(null));
    }

    @Override
    public List<String> getLectureNamesForSemester(String course) {
        var config = coursePersistancePort.getCourseRaplaConfig(course);
        if (config.isEmpty()) {
            throw new CourseNotFoundException(ErrorCode.COURSE_NOT_FOUND.getCode());
        }

        var resolved = raplaUrlResolver.resolve(config.get());
        return raplaApiPort.getLectureNamesForSemester(resolved.url());
    }

    private com.survivalkit.backend.adapter.rapla.ResolvedRaplaUrl resolveRaplaUrl(String course, String raplaUrl) {
        if (course != null && !course.isEmpty()) {
            var config = coursePersistancePort.getCourseRaplaConfig(course);
            if (config.isPresent()) {
                return raplaUrlResolver.resolve(config.get());
            }
            if (raplaUrl == null || raplaUrl.isEmpty()) {
                throw new CourseNotFoundException(ErrorCode.COURSE_NOT_FOUND.getCode());
            }
        }

        if (raplaUrl != null && !raplaUrl.isEmpty()) {
            var baseUrl = raplaApiPort.formatToBaseUrl(raplaUrl);
            var extractedCourse = raplaApiPort.extractCourse(baseUrl);
            var adapterId = adapterRegistry.resolveForUrl(baseUrl).id();
            coursePersistancePort.saveRaplaUrl(extractedCourse, baseUrl, adapterId);
            return raplaUrlResolver.resolveDirectUrl(baseUrl);
        }

        throw new IllegalArgumentException(ErrorCode.RAPLA_URL_AND_COURSE_EMPTY.getCode());
    }
}
