package com.survivalkit.backend.core.lecture;

import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.rapla.RaplaApiPort;
import com.survivalkit.backend.adapter.rapla.RaplaUrlResolver;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class LectureService implements LecturePort {

    private final RaplaApiPort raplaApiPort;
    private final CoursePersistancePort coursePersistancePort;
    private final RaplaUrlResolver raplaUrlResolver;

    public LectureService(
            RaplaApiPort raplaApiPort,
            CoursePersistancePort coursePersistancePort,
            RaplaUrlResolver raplaUrlResolver
    ) {
        this.raplaApiPort = raplaApiPort;
        this.coursePersistancePort = coursePersistancePort;
        this.raplaUrlResolver = raplaUrlResolver;
    }

    @Override
    public LecturePlanResult getLecturesForWeek(int weekOffset, String course, String raplaUrl) {
        var url = resolveUrl(course, raplaUrl);
        if (url.isEmpty()) {
            return new LecturePlanResult(List.of(), null, false);
        }

        var lectures = raplaApiPort.getLectures(weekOffset, url.get());
        return new LecturePlanResult(lectures, null, true);
    }

    @Override
    public List<String> getLectureNamesForSemester(String course) {
        var url = resolveUrl(course, null);
        if (url.isEmpty()) {
            return List.of();
        }

        return raplaApiPort.getLectureNamesForSemester(url.get());
    }

    private Optional<String> resolveUrl(String course, String raplaUrl) {
        if (hasText(course)) {
            var config = coursePersistancePort.getCourseRaplaConfig(course);
            if (config.isPresent() && config.get().hasUrl()) {
                return Optional.of(raplaUrlResolver.resolve(config.get()).url());
            }
            if (!hasText(raplaUrl)) {
                return Optional.empty();
            }
        }

        if (hasText(raplaUrl)) {
            return Optional.of(raplaUrlResolver.resolveDirectUrl(raplaUrl).url());
        }

        return Optional.empty();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
