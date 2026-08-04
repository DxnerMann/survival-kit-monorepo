package com.survivalkit.backend.adapter.randomword;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class GermanWordFallbackWords {
    private static final String RESOURCE_PATH = "presentation-game/fallback-words-de.txt";
    private final List<String> words;

    public GermanWordFallbackWords() {
        this.words = load();
    }

    public List<String> all() {
        return words;
    }

    private static List<String> load() {
        try (var reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource(RESOURCE_PATH).getInputStream(),
                StandardCharsets.UTF_8
        ))) {
            return reader.lines()
                    .map(String::trim)
                    .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                    .map(GermanWordNormalizer::normalize)
                    .filter(word -> word != null)
                    .collect(Collectors.toList());
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to load fallback words from " + RESOURCE_PATH, exception);
        }
    }
}
