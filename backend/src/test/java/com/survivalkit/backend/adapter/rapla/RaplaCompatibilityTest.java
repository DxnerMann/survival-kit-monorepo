package com.survivalkit.backend.adapter.rapla;

import com.survivalkit.backend.adapter.postgres.course.CourseRaplaConfig;
import com.survivalkit.backend.adapter.rapla.adapter.RaplaAdapterV2;
import com.survivalkit.backend.adapter.rapla.adapter.RaplaAdapterV1;
import com.survivalkit.backend.adapter.rapla.adapter.RaplaAdapter;
import com.survivalkit.backend.adapter.rapla.support.WeekTableLectureParser;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RaplaAdapterRegistryTest {

    private RaplaAdapterRegistry registry;

    @BeforeEach
    void setUp() {
        registry = new RaplaAdapterRegistry(java.util.List.of(
                new RaplaAdapterV1(),
                new RaplaAdapterV2()
        ));
    }

    @Test
    void resolvesLegacyKarlsruheUrl() {
        var adapter = registry.resolveForUrl(
                "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6"
        );
        assertEquals(RaplaAdapter.V1, adapter.id());
    }

    @Test
    void resolvesCentralUrl() {
        var adapter = registry.resolveForUrl(
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6"
        );
        assertEquals(RaplaAdapter.V2, adapter.id());
    }
}

class RaplaUrlResolverTest {

    private RaplaUrlResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new RaplaUrlResolver(new RaplaAdapterRegistry(java.util.List.of(
                new RaplaAdapterV1(),
                new RaplaAdapterV2()
        )));
    }

    @Test
    void usesV1BeforeCutoff() {
        var resolved = resolverWithDate(LocalDate.of(2026, 9, 30)).resolve(configWithBothUrls());

        assertEquals(RaplaAdapter.V1, resolved.adapterId());
        assertTrue(resolved.notice().isEmpty());
    }

    @Test
    void usesV2AfterCutoffWhenAvailable() {
        var resolved = resolverWithDate(LocalDate.of(2026, 10, 1)).resolve(configWithBothUrls());

        assertEquals(RaplaAdapter.V2, resolved.adapterId());
        assertTrue(resolved.notice().isEmpty());
    }

    @Test
    void fallsBackToV1WithNoticeAfterCutoff() {
        var resolved = resolverWithDate(LocalDate.of(2026, 10, 1)).resolve(
                new CourseRaplaConfig(
                        "TINF24B6",
                        Map.of(
                                RaplaAdapter.V1,
                                "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6"
                        )
                )
        );

        assertEquals(RaplaAdapter.V1, resolved.adapterId());
        assertEquals(RaplaMigration.LEGACY_IN_USE_NOTICE, resolved.notice().orElseThrow());
    }

    @Test
    void directV1UrlAfterCutoffShowsNotice() {
        var adapter = new RaplaAdapterV1() {
            @Override
            public Optional<String> deprecationNoticeWhenUsedAt(LocalDate date) {
                return Optional.of(RaplaMigration.LEGACY_IN_USE_NOTICE);
            }
        };

        var resolved = new RaplaUrlResolver(new RaplaAdapterRegistry(java.util.List.of(
                adapter,
                new RaplaAdapterV2()
        ))).resolveDirectUrl(
                "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6"
        );

        assertEquals(RaplaAdapter.V1, resolved.adapterId());
        assertEquals(RaplaMigration.LEGACY_IN_USE_NOTICE, resolved.notice().orElseThrow());
    }

    private CourseRaplaConfig configWithBothUrls() {
        return new CourseRaplaConfig(
                "TINF24B6",
                Map.of(
                        RaplaAdapter.V1,
                        "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6",
                        RaplaAdapter.V2,
                        "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6"
                )
        );
    }

    private RaplaUrlResolver resolverWithDate(LocalDate date) {
        var v1 = new RaplaAdapterV1() {
            @Override
            public int preferenceOrderAt(LocalDate currentDate) {
                return currentDate.isBefore(date) ? 0 : 100;
            }

            @Override
            public Optional<String> deprecationNoticeWhenUsedAt(LocalDate currentDate) {
                return !currentDate.isBefore(date)
                        ? Optional.of(RaplaMigration.LEGACY_IN_USE_NOTICE)
                        : Optional.empty();
            }
        };

        var v2 = new RaplaAdapterV2() {
            @Override
            public int preferenceOrderAt(LocalDate currentDate) {
                return currentDate.isBefore(date) ? 100 : 0;
            }
        };

        return new RaplaUrlResolver(new RaplaAdapterRegistry(java.util.List.of(v1, v2)));
    }
}

class RaplaAdapterFormattingTest {

    private final RaplaAdapter legacyAdapter = new RaplaAdapterV1();
    private final RaplaAdapter centralAdapter = new RaplaAdapterV2();

    @Test
    void legacyFormatToBaseUrlStripsWeekParams() {
        var formatted = legacyAdapter.formatToBaseUrl(
                "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6&day=3&month=8&year=2026"
        );

        assertEquals(
                "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6",
                formatted
        );
    }

    @Test
    void centralFormatToBaseUrlStripsWeekParams() {
        var formatted = centralAdapter.formatToBaseUrl(
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6&day=3&month=8&year=2026"
        );

        assertEquals(
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6",
                formatted
        );
    }
}

class WeekTableLectureParserTest {

    @Test
    void parsesLegacyWeekHtml() throws IOException {
        var html = loadResource("rapla/legacy-week.html");
        var lectures = WeekTableLectureParser.parse(Jsoup.parse(html));

        assertEquals(1, lectures.size());
        assertEquals("Software Engineering", lectures.get(0).title());
        assertEquals("9:00", lectures.get(0).startTime());
        assertEquals("12:30", lectures.get(0).endTime());
    }

    @Test
    void parsesNewWeekHtml() throws IOException {
        var html = loadResource("rapla/new-week.html");
        var lectures = WeekTableLectureParser.parse(Jsoup.parse(html));

        assertEquals(1, lectures.size());
        assertEquals("Software Engineering", lectures.get(0).title());
        assertEquals("09:00", lectures.get(0).startTime());
        assertEquals("12:30", lectures.get(0).endTime());
    }

    @Test
    void centralAdapterExtractsCourseFromTitle() throws IOException {
        var html = loadResource("rapla/new-week.html");
        var course = new RaplaAdapterV2().extractCourse(
                Jsoup.parse(html),
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6"
        );

        assertEquals("TINF24B6", course);
    }

    @Test
    void legacyAdapterPrefersTitleOverFileParam() throws IOException {
        var html = loadResource("rapla/legacy-week.html");
        var course = new RaplaAdapterV1().extractCourse(
                Jsoup.parse(html),
                "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6"
        );

        assertEquals("TINF24B6", course);
    }

    @Test
    void cutoffDateIsFirstOfOctober2026() {
        assertEquals(LocalDate.of(2026, 10, 1), RaplaMigration.NEW_RAPLA_CUTOFF);
    }

    private String loadResource(String path) throws IOException {
        try (var stream = Objects.requireNonNull(getClass().getClassLoader().getResourceAsStream(path))) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
