package com.survivalkit.backend.adapter.randomword;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class RandomGermanWordApiClient implements RandomGermanWordPort {

    private static final Logger log = LoggerFactory.getLogger(RandomGermanWordApiClient.class);
    private static final int MAX_REQUEST_SIZE = 50;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public RandomGermanWordApiClient(RestClient restClient, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<String> fetchRandomWords(int count) {
        var target = Math.min(Math.max(count, 1), MAX_REQUEST_SIZE);
        var uri = UriComponentsBuilder
                .fromUriString("https://alex-riedel.de/randV2.php")
                .queryParam("anz", target)
                .build()
                .toUri();

        try {
            var response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(String.class);

            if (response == null || response.isBlank()) {
                return List.of();
            }

            var fetched = objectMapper.readValue(response, new TypeReference<List<String>>() {});
            var words = new ArrayList<String>();
            var seen = new HashSet<String>();

            for (var rawWord : fetched) {
                var normalized = GermanWordNormalizer.normalize(rawWord);
                if (normalized == null) {
                    continue;
                }

                var key = normalized.toLowerCase(Locale.ROOT);
                if (seen.add(key)) {
                    words.add(normalized);
                }
            }

            return List.copyOf(words);
        } catch (RestClientException | com.fasterxml.jackson.core.JsonProcessingException exception) {
            log.warn(
                    "Random word API request failed ({}). Using local fallback words. "
                            + "Corporate TLS inspection often causes this in Java; browsers use a different trust store.",
                    exception.toString()
            );
            return List.of();
        }
    }
}
