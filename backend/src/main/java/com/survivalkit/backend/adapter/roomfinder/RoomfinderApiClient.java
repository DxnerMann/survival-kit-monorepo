package com.survivalkit.backend.adapter.roomfinder;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.core.roomfinder.BusySlot;
import com.survivalkit.backend.core.roomfinder.FreeRoom;
import com.survivalkit.backend.core.roomfinder.RoomAvailability;
import com.survivalkit.backend.core.roomfinder.RoomDaySchedule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class RoomfinderApiClient implements RoomfinderClient {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;

    public RoomfinderApiClient(
            RestClient restClient,
            ObjectMapper objectMapper,
            @Value("${app.roomfinder.base-url}") String baseUrl
    ) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
        this.baseUrl = stripTrailingSlash(baseUrl);
    }

    @Override
    public UpstreamFreeRooms findFreeRooms(LocalDateTime from, LocalDateTime to, String near, int limit) {
        var uri = window(baseUrl, from, to)
                .path("/api/v1/rooms/free")
                .queryParam("limit", limit);
        if (near != null && !near.isBlank()) {
            uri.queryParam("near", near);
        }

        var body = get(uri, FreeRoomsResponse.class);
        var rooms = body.rooms() == null ? List.<FreeRoom>of() : List.copyOf(body.rooms());
        return new UpstreamFreeRooms(body.fromUnix(), body.toUnix(), rooms);
    }

    @Override
    public RoomAvailability checkRoom(String room, LocalDateTime from, LocalDateTime to) {
        var uri = window(baseUrl, from, to)
                .path("/api/v1/rooms/{room}/check")
                .buildAndExpand(room)
                .encode()
                .toUri();
        var body = read(uri, AvailabilityResponse.class);
        var busy = body.busyDuring() == null ? List.<BusySlot>of() : List.copyOf(body.busyDuring());
        return new RoomAvailability(body.room(), body.free(), body.fromUnix(), body.toUnix(), busy);
    }

    @Override
    public RoomDaySchedule busySlots(String room, LocalDate date) {
        var from = date.atStartOfDay();
        var to = date.plusDays(1).atStartOfDay();
        var uri = window(baseUrl, from, to)
                .path("/api/v1/rooms/{room}/check")
                .buildAndExpand(room)
                .encode()
                .toUri();
        var body = read(uri, AvailabilityResponse.class);
        var busy = body.busyDuring() == null ? List.<BusySlot>of() : List.copyOf(body.busyDuring());
        return new RoomDaySchedule(body.room() == null ? room : body.room(), date.toString(), busy);
    }

    private UriComponentsBuilder window(String host, LocalDateTime from, LocalDateTime to) {
        return UriComponentsBuilder.fromUriString(host)
                .queryParam("date", from.toLocalDate())
                .queryParam("time", from.toLocalTime().format(TIME))
                .queryParam("end_date", to.toLocalDate())
                .queryParam("end_time", to.toLocalTime().format(TIME));
    }

    private <T> T get(UriComponentsBuilder uri, Class<T> type) {
        return read(uri.build().encode().toUri(), type);
    }

    private <T> T read(java.net.URI uri, Class<T> type) {
        try {
            var json = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(String.class);
            if (json == null || json.isBlank()) {
                throw new RuntimeException(ErrorCode.ROOMFINDER_REQUEST_FAILED.getCode());
            }
            return objectMapper.readValue(json, type);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 400) {
                throw new IllegalArgumentException(ErrorCode.ROOMFINDER_INVALID_QUERY.getCode());
            }
            throw new RuntimeException(ErrorCode.ROOMFINDER_REQUEST_FAILED.getCode(), exception);
        } catch (RestClientException | JsonProcessingException exception) {
            throw new RuntimeException(ErrorCode.ROOMFINDER_REQUEST_FAILED.getCode(), exception);
        }
    }

    private static String stripTrailingSlash(String url) {
        if (url.endsWith("/")) {
            return url.substring(0, url.length() - 1);
        }
        return url;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record FreeRoomsResponse(
            @JsonProperty("from_unix") long fromUnix,
            @JsonProperty("to_unix") long toUnix,
            List<FreeRoom> rooms
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AvailabilityResponse(
            String room,
            @JsonProperty("is_free") boolean free,
            @JsonProperty("from_unix") long fromUnix,
            @JsonProperty("to_unix") long toUnix,
            @JsonProperty("busy_during") List<BusySlot> busyDuring
    ) {}
}
