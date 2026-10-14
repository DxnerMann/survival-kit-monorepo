package com.survivalkit.backend.adapter.roomfinder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.adapter.web.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RoomfinderApiClientTest {

    private MockRestServiceServer server;
    private RoomfinderApiClient client;

    @BeforeEach
    void setUp() {
        var builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new RoomfinderApiClient(
                builder.build(),
                new ObjectMapper(),
                "http://roomfinder:8000/"
        );
    }

    @Test
    void findFreeRoomsMapsTheUpstreamPayload() {
        server.expect(requestTo(containsString("/api/v1/rooms/free")))
                .andExpect(queryParam("date", "2026-10-08"))
                .andExpect(queryParam("time", "09:00"))
                .andExpect(queryParam("end_time", "11:00"))
                .andExpect(queryParam("near", "A171"))
                .andExpect(queryParam("limit", "21"))
                .andRespond(withSuccess("""
                        {"from_unix":1,"to_unix":2,"rooms":[{"room":"A172","distance":1}]}
                        """, MediaType.APPLICATION_JSON));

        var result = client.findFreeRooms(
                LocalDateTime.of(2026, 10, 8, 9, 0),
                LocalDateTime.of(2026, 10, 8, 11, 0),
                "A171",
                21
        );

        assertEquals(1, result.fromUnix());
        assertEquals("A172", result.rooms().getFirst().room());
        assertEquals(1, result.rooms().getFirst().distance());
        server.verify();
    }

    @Test
    void checkRoomCarriesTheWindowAcrossMidnight() {
        server.expect(requestTo(containsString("/api/v1/rooms/A171/check")))
                .andExpect(queryParam("date", "2026-10-08"))
                .andExpect(queryParam("time", "23:00"))
                .andExpect(queryParam("end_date", "2026-10-09"))
                .andExpect(queryParam("end_time", "01:00"))
                .andRespond(withSuccess("""
                        {"room":"A171","is_free":false,"from_unix":3,"to_unix":4,"busy_during":[{"start":3,"end":4,"summary":"BWL 1","courses":["KA-TINF24B1"]}]}
                        """, MediaType.APPLICATION_JSON));

        var result = client.checkRoom(
                "A171",
                LocalDateTime.of(2026, 10, 8, 23, 0),
                LocalDateTime.of(2026, 10, 9, 1, 0)
        );

        assertFalse(result.free());
        assertEquals(3, result.busyDuring().getFirst().start());
        assertEquals("BWL 1", result.busyDuring().getFirst().summary());
        assertEquals(List.of("KA-TINF24B1"), result.busyDuring().getFirst().courses());
        server.verify();
    }

    @Test
    void busySlotsReadsTheDayCheckFromBaseUrl() {
        server.expect(requestTo(containsString("/api/v1/rooms/B240/check")))
                .andExpect(queryParam("date", "2026-10-08"))
                .andExpect(queryParam("time", "00:00"))
                .andExpect(queryParam("end_date", "2026-10-09"))
                .andExpect(queryParam("end_time", "00:00"))
                .andRespond(withSuccess("""
                        {"room":"B240","is_free":false,"from_unix":5,"to_unix":6,"busy_during":[{"start":5,"end":6,"summary":"Programmieren","courses":["KA-TINF24B1"]}]}
                        """, MediaType.APPLICATION_JSON));

        var result = client.busySlots("B240", LocalDate.of(2026, 10, 8));

        assertEquals("B240", result.room());
        assertEquals("2026-10-08", result.date());
        assertEquals(6, result.busyDuring().getFirst().end());
        assertEquals("Programmieren", result.busyDuring().getFirst().summary());
        assertEquals(List.of("KA-TINF24B1"), result.busyDuring().getFirst().courses());
        server.verify();
    }

    @Test
    void mapsUpstreamValidationErrorsToAnInvalidQuery() {
        server.expect(requestTo(containsString("/api/v1/rooms/free")))
                .andRespond(withBadRequest());

        var error = assertThrows(IllegalArgumentException.class, () -> client.findFreeRooms(
                LocalDateTime.of(2026, 10, 8, 9, 0),
                LocalDateTime.of(2026, 10, 8, 11, 0),
                null,
                21
        ));

        assertEquals(ErrorCode.ROOMFINDER_INVALID_QUERY.getCode(), error.getMessage());
    }

    @Test
    void mapsAFailedDayCheckToAnUpstreamFailure() {
        server.expect(requestTo(containsString("/api/v1/rooms/A171/check")))
                .andRespond(withResourceNotFound());

        var error = assertThrows(RuntimeException.class, () ->
                client.busySlots("A171", LocalDate.of(2026, 10, 8))
        );

        assertEquals(ErrorCode.ROOMFINDER_REQUEST_FAILED.getCode(), error.getMessage());
    }
}
