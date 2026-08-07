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
    void resolvesV1KarlsruheUrl() {
        var adapter = registry.resolveForUrl(
                "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6"
        );
        assertEquals(RaplaAdapter.V1, adapter.id());
    }

    @Test
    void resolvesV2Url() {
        var adapter = registry.resolveForUrl(
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6"
        );
        assertEquals(RaplaAdapter.V2, adapter.id());
    }
}

class RaplaUrlResolverTest {

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
        var resolved = resolverWithDate(LocalDate.of(2026, 10, 1)).resolveDirectUrl(
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
        return new RaplaUrlResolver(
                new RaplaAdapterRegistry(java.util.List.of(
                        new RaplaAdapterV1(),
                        new RaplaAdapterV2()
                )),
                () -> date
        );
    }
}

class RaplaAdapterFormattingTest {

    private final RaplaAdapter v1Adapter = new RaplaAdapterV1();
    private final RaplaAdapter v2Adapter = new RaplaAdapterV2();

    @Test
    void v1FormatToBaseUrlStripsWeekParams() {
        var formatted = v1Adapter.formatToBaseUrl(
                "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6&day=3&month=8&year=2026"
        );

        assertEquals(
                "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6",
                formatted
        );
    }

    @Test
    void v2FormatToBaseUrlStripsWeekParams() {
        var formatted = v2Adapter.formatToBaseUrl(
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
    void parsesV1WeekHtml() throws IOException {
        var html = loadResource("rapla/legacy-week.html");
        var lectures = WeekTableLectureParser.parse(Jsoup.parse(html));

        assertEquals(1, lectures.size());
        assertEquals("Software Engineering", lectures.get(0).title());
        assertEquals("9:00", lectures.get(0).startTime());
        assertEquals("12:30", lectures.get(0).endTime());
    }

    @Test
    void parsesV2WeekHtml() throws IOException {
        var html = loadResource("rapla/new-week.html");
        var lectures = WeekTableLectureParser.parse(Jsoup.parse(html));

        assertEquals(1, lectures.size());
        assertEquals("Software Engineering", lectures.get(0).title());
        assertEquals("09:00", lectures.get(0).startTime());
        assertEquals("12:30", lectures.get(0).endTime());
    }

    @Test
    void v2AdapterExtractsCourseFromTitle() throws IOException {
        var html = loadResource("rapla/new-week.html");
        var course = new RaplaAdapterV2().extractCourse(
                Jsoup.parse(html),
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6"
        );

        assertEquals("TINF24B6", course);
    }

    @Test
    void v1AdapterPrefersTitleOverFileParam() throws IOException {
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
