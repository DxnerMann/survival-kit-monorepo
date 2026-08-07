package com.survivalkit.backend.adapter.rapla;

import com.survivalkit.backend.adapter.postgres.course.CourseRaplaConfig;
import com.survivalkit.backend.adapter.rapla.adapter.RaplaAdapter;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.Optional;

@Component
public class RaplaUrlResolver {

    private final RaplaAdapterRegistry adapterRegistry;

    public RaplaUrlResolver(RaplaAdapterRegistry adapterRegistry) {
        this.adapterRegistry = adapterRegistry;
    }

    public ResolvedRaplaUrl resolve(CourseRaplaConfig config) {
        var today = today();

        var chosen = config.urlsByVersion().entrySet().stream()
                .map(entry -> new VersionCandidate(adapterRegistry.getById(entry.getKey()), entry.getValue()))
                .sorted(Comparator.comparingInt(candidate -> candidate.adapter().preferenceOrderAt(today)))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No Rapla URL configured for course"));

        return toResolved(chosen.adapter(), chosen.url(), today);
    }

    public ResolvedRaplaUrl resolveDirectUrl(String raplaBaseUrl) {
        var adapter = adapterRegistry.resolveForUrl(raplaBaseUrl);
        var formattedUrl = adapter.formatToBaseUrl(raplaBaseUrl);
        return toResolved(adapter, formattedUrl, today());
    }

    private ResolvedRaplaUrl toResolved(RaplaAdapter adapter, String url, LocalDate today) {
        return new ResolvedRaplaUrl(url, adapter.id(), adapter.deprecationNoticeWhenUsedAt(today));
    }

    protected LocalDate today() {
        return LocalDate.now(RaplaMigration.ZONE);
    }

    private record VersionCandidate(RaplaAdapter adapter, String url) {}
}
