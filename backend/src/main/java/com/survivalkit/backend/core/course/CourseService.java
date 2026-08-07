package com.survivalkit.backend.core.course;

import com.survivalkit.backend.adapter.postgres.course.CoursePersistancePort;
import com.survivalkit.backend.adapter.rapla.RaplaAdapterRegistry;
import com.survivalkit.backend.adapter.rapla.RaplaApiPort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CourseService implements CoursePort {

    private final RaplaApiPort raplaApiPort;
    private final CoursePersistancePort coursePersistancePort;
    private final RaplaAdapterRegistry adapterRegistry;

    public CourseService(
            RaplaApiPort raplaApiPort,
            CoursePersistancePort coursePersistancePort,
            RaplaAdapterRegistry adapterRegistry
    ) {
        this.raplaApiPort = raplaApiPort;
        this.coursePersistancePort = coursePersistancePort;
        this.adapterRegistry = adapterRegistry;
    }

    @Override
    public List<String> getAvailableCourses() {
        return coursePersistancePort.getAvailableCourses();
    }

    @Override
    public String extract(String raplaUrl) {
        var baseUrl = raplaApiPort.formatToBaseUrl(raplaUrl);
        var extractedCourse = raplaApiPort.extractCourse(baseUrl);
        var adapterId = adapterRegistry.resolveForUrl(baseUrl).id();
        coursePersistancePort.saveRaplaUrl(extractedCourse, baseUrl, adapterId);
        return extractedCourse;
    }
}
