package com.survivalkit.backend.adapter.rapla;

import com.survivalkit.backend.adapter.postgres.course.CourseRaplaConfig;
import com.survivalkit.backend.adapter.web.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class RaplaUrlResolver {

    private final RaplaAdapterRegistry adapterRegistry;

    public RaplaUrlResolver(RaplaAdapterRegistry adapterRegistry) {
        this.adapterRegistry = adapterRegistry;
    }

    public ResolvedRaplaUrl resolve(CourseRaplaConfig config) {
        if (!config.hasUrl()) {
            throw new IllegalArgumentException(ErrorCode.COURSE_NOT_FOUND.getCode());
        }
        return resolveDirectUrl(config.url());
    }

    public ResolvedRaplaUrl resolveDirectUrl(String raplaBaseUrl) {
        var adapter = adapterRegistry.resolveForUrl(raplaBaseUrl);
        var formattedUrl = adapter.formatToBaseUrl(raplaBaseUrl);
        return new ResolvedRaplaUrl(formattedUrl, adapter.id(), Optional.empty());
    }
}
