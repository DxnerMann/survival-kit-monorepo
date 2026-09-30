package com.survivalkit.backend.adapter.rapla;

import com.survivalkit.backend.adapter.postgres.course.CourseRaplaConfig;
import com.survivalkit.backend.adapter.rapla.adapter.RaplaAdapter;
import com.survivalkit.backend.adapter.rapla.adapter.RaplaAdapterV2;
import com.survivalkit.backend.adapter.rapla.support.WeekTableLectureParser;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.shared.Lecture;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.util.List;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RaplaAdapterRegistryTest {

    private RaplaAdapterRegistry registry;

    @BeforeEach
    void setUp() {
        registry = new RaplaAdapterRegistry(java.util.List.of(new RaplaAdapterV2()));
    }

    @Test
    void resolvesV2Url() {
        var adapter = registry.resolveForUrl(
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6"
        );
        assertEquals(RaplaAdapter.V2, adapter.id());
    }

    @Test
    void rejectsLegacyKarlsruheUrl() {
        assertThrows(IllegalArgumentException.class, () -> registry.resolveForUrl(
                "https://rapla.dhbw-karlsruhe.de/rapla?page=calendar&user=li&file=TINF24B6"
        ));
    }
}

class RaplaUrlResolverTest {

    private final RaplaUrlResolver resolver = new RaplaUrlResolver(
            new RaplaAdapterRegistry(java.util.List.of(new RaplaAdapterV2()))
    );

    @Test
    void resolvesStoredUrl() {
        var resolved = resolver.resolve(new CourseRaplaConfig(
                "TINF24B6",
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6"
        ));

        assertEquals(RaplaAdapter.V2, resolved.adapterId());
        assertEquals(
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6",
                resolved.url()
        );
        assertTrue(resolved.notice().isEmpty());
    }

    @Test
    void rejectsCourseWithoutUrl() {
        var error = assertThrows(IllegalArgumentException.class, () -> resolver.resolve(
                new CourseRaplaConfig("TINF24B6", " ")
        ));

        assertEquals(ErrorCode.COURSE_NOT_FOUND.getCode(), error.getMessage());
    }
}

class RaplaAdapterFormattingTest {

    private final RaplaAdapter v2Adapter = new RaplaAdapterV2();

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

    @Test
    void v2WeekRequestKeepsEncodedUser() {
        var uri = v2Adapter.buildWeekRequestUri(
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6",
                java.time.LocalDate.of(2026, 9, 28)
        );

        assertEquals(
                "https://rapla.dhbw.de/rapla/calendar?user=li%40dhbw-karlsruhe.aa&file=24B6&day=28&month=9&year=2026",
                uri.toString()
        );
    }

    @Test
    void v2FormatToBaseUrlKeepsSaltAndKey() {
        var formatted = v2Adapter.formatToBaseUrl(
                "https://rapla.dhbw.de/rapla/calendar?salt=abc&key=def&day=3&month=8&year=2026"
        );

        assertEquals(
                "https://rapla.dhbw.de/rapla/calendar?salt=abc&key=def",
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
    void parsesV2WeekHtml() throws IOException {
        var html = loadResource("rapla/new-week.html");
        var lectures = WeekTableLectureParser.parse(Jsoup.parse(html));

        assertEquals(1, lectures.size());
        assertEquals("Software Engineering", lectures.get(0).title());
        assertEquals("09:00", lectures.get(0).startTime());
        assertEquals("12:30", lectures.get(0).endTime());
    }

    @Test
    void parsesCurrentRaplaWeekMarkup() throws IOException {
        var html = loadResource("rapla/v2-live-week.html");
        var lectures = WeekTableLectureParser.parse(Jsoup.parse(html));

        assertEquals(1, lectures.size());
        var lecture = lectures.getFirst();
        assertEquals("Data Science", lecture.title());
        assertEquals("08:30", lecture.startTime());
        assertEquals("12:45", lecture.endTime());
        assertEquals(DayOfWeek.WEDNESDAY, lecture.day());
        assertEquals(Lecture.LectureType.LECTURE, lecture.type());
        assertEquals(List.of("E209 Hörsaal"), lecture.rooms());
        assertEquals(List.of("KA-TINF24B6"), lecture.courses());
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
    void mapsRedExamBlocksAndLeavesKlausurWeekAsOther() {
        var html = """
                <table class="week_table">
                  <tr>
                    <td class="week_header" colspan="1">Mo 14.12.</td>
                  </tr>
                  <tr>
                    <td class="week_block" style="background-color:#ff6666">
                      <a>09:00 -11:00<br/>Klausur Data Science</a>
                    </td>
                  </tr>
                  <tr>
                    <td class="week_block" style="background-color:#c0e2ff">
                      <a>07:30 -08:00<br/>Klausurwoche</a>
                    </td>
                  </tr>
                  <tr>
                    <td class="week_block" style="background-color:#eeeeee">
                      <a>10:00 -12:00<br/>Data Science</a>
                    </td>
                  </tr>
                </table>
                """;

        var lectures = WeekTableLectureParser.parse(Jsoup.parse(html));

        assertEquals(Lecture.LectureType.EXAM, lectures.get(0).type());
        assertEquals("Klausur Data Science", lectures.get(0).title());
        assertEquals(Lecture.LectureType.OTHER, lectures.get(1).type());
        assertEquals(Lecture.LectureType.LECTURE, lectures.get(2).type());
    }

    private String loadResource(String path) throws IOException {
        try (var stream = Objects.requireNonNull(getClass().getClassLoader().getResourceAsStream(path))) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
