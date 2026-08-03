package com.survivalkit.backend.adapter.randomword;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoom;
import com.survivalkit.backend.core.presentationgame.GermanWordPort;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class RandomGermanWordApiClient implements GermanWordPort {

    private static final String API_URL =
            "https://random-word-api.herokuapp.com/word?number={batch}&lang=de&diff={diff}";
    private static final int API_BATCH_SIZE = 5;
    private static final int MAX_FETCH = 50;
    private static final int MAX_API_ATTEMPTS = 24;
    private static final Pattern VALID_WORD = Pattern.compile("^[a-zA-ZäöüÄÖÜß]{3,32}$");

    private static final List<String> FALLBACK_EASY = List.of(
            "Vogel", "Haus", "Baum", "Buch", "Tisch", "Lampe", "Maus", "Rose", "Sonne", "Mond",
            "Hand", "Kind", "Wort", "Ball", "Boot", "Brot", "Dorf", "Fisch", "Glas", "Hund",
            "Insel", "Jacke", "Karte", "Licht", "Nase", "Ohr", "Pferd", "Regen", "Salz", "Turm"
    );

    private static final List<String> FALLBACK_MEDIUM = List.of(
            "Fenster", "Gitarre", "Fahrrad", "Computer", "Qualität", "Regenschirm", "Schule",
            "Lehrer", "Student", "Projekt", "Meeting", "Kaffee", "Frühstück", "Abendessen",
            "Wochenende", "Semester", "Vorlesung", "Prüfung", "Campus", "Bibliothek"
    );

    private static final List<String> FALLBACK_HARD = List.of(
            "Vogelnest", "Dachfenster", "Handschuh", "Schreibtisch", "Krankenhaus", "Fernseher",
            "Bundesliga", "Wissenschaft", "Universität", "Hochschule", "Mitbewohner", "Stromrechnung",
            "Winterjacke", "Fahrradkette", "Kaffeemaschine", "Regenwolken", "Schneeflocken",
            "Bundesrepublik", "Verkehrsampel", "Geburtstagskuchen", "Klassenzimmer", "Sommerferien"
    );

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public RandomGermanWordApiClient(RestClient restClient, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<String> fetchWords(
            int count,
            PresentationGameRoom.Difficulty difficulty,
            Collection<String> exclude
    ) {
        var target = Math.min(Math.max(count, 1), MAX_FETCH);
        var words = new ArrayList<String>();
        var seen = new HashSet<String>();

        if (exclude != null) {
            exclude.stream()
                    .filter(word -> word != null && !word.isBlank())
                    .map(word -> word.toLowerCase(Locale.ROOT))
                    .forEach(seen::add);
        }

        fetchFromApi(target, difficulty, seen, words);

        if (words.size() < target) {
            addFallbackWords(target, difficulty, seen, words);
        }

        Collections.shuffle(words);
        return words.subList(0, Math.min(target, words.size()));
    }

    private void fetchFromApi(
            int target,
            PresentationGameRoom.Difficulty difficulty,
            Set<String> seen,
            List<String> words
    ) {
        var diff = apiDiffFor(difficulty);

        for (int attempt = 0; attempt < MAX_API_ATTEMPTS && words.size() < target; attempt++) {
            try {
                var response = restClient.get()
                        .uri(API_URL, API_BATCH_SIZE, diff)
                        .retrieve()
                        .body(String.class);

                if (response == null || response.isBlank()) {
                    continue;
                }

                var fetched = objectMapper.readValue(response, new TypeReference<List<String>>() {});
                for (var word : fetched) {
                    addIfValid(word, difficulty, seen, words);
                    if (words.size() >= target) {
                        return;
                    }
                }
            } catch (RestClientException | com.fasterxml.jackson.core.JsonProcessingException ignored) {
            }
        }
    }

    private void addFallbackWords(
            int target,
            PresentationGameRoom.Difficulty difficulty,
            Set<String> seen,
            List<String> words
    ) {
        var fallback = switch (difficulty) {
            case EASY -> FALLBACK_EASY;
            case MEDIUM -> FALLBACK_MEDIUM;
            case HARD -> FALLBACK_HARD;
        };

        var shuffled = new ArrayList<>(fallback);
        Collections.shuffle(shuffled);
        for (var word : shuffled) {
            addIfValid(word, difficulty, seen, words);
            if (words.size() >= target) {
                return;
            }
        }
    }

    private void addIfValid(
            String rawWord,
            PresentationGameRoom.Difficulty difficulty,
            Set<String> seen,
            List<String> words
    ) {
        if (rawWord == null || rawWord.isBlank()) {
            return;
        }

        var normalized = capitalize(rawWord.trim());
        var key = normalized.toLowerCase(Locale.ROOT);
        if (!VALID_WORD.matcher(normalized).matches()
                || seen.contains(key)
                || !matchesDifficulty(normalized, difficulty)) {
            return;
        }

        seen.add(key);
        words.add(normalized);
    }

    private boolean matchesDifficulty(String word, PresentationGameRoom.Difficulty difficulty) {
        var length = word.length();
        return switch (difficulty) {
            case EASY -> length >= 3 && length <= 6;
            case MEDIUM -> length >= 7 && length <= 10;
            case HARD -> length >= 9;
        };
    }

    private int apiDiffFor(PresentationGameRoom.Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> 1;
            case MEDIUM -> 3;
            case HARD -> 5;
        };
    }

    private String capitalize(String word) {
        if (word.length() <= 1) {
            return word.toUpperCase(Locale.ROOT);
        }
        return Character.toUpperCase(word.charAt(0)) + word.substring(1).toLowerCase(Locale.ROOT);
    }
}
