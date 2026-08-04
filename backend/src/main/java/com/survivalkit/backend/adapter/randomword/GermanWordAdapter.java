package com.survivalkit.backend.adapter.randomword;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoom;
import com.survivalkit.backend.core.presentationgame.GermanWordPort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
@Service
public class GermanWordAdapter implements GermanWordPort {

    private static final int MAX_FETCH = 50;
    private static final int MAX_API_ROUNDS = 4;

    private final RandomGermanWordPort randomGermanWordPort;
    private final GermanWordFallbackWords fallbackWords;

    public GermanWordAdapter(
            RandomGermanWordPort randomGermanWordPort,
            GermanWordFallbackWords fallbackWords
    ) {
        this.randomGermanWordPort = randomGermanWordPort;
        this.fallbackWords = fallbackWords;
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

        for (int round = 0; round < MAX_API_ROUNDS && words.size() < target; round++) {
            var batch = randomGermanWordPort.fetchRandomWords(target - words.size());
            if (batch.isEmpty()) {
                break;
            }

            for (var word : batch) {
                addIfValid(word, seen, words);
                if (words.size() >= target) {
                    break;
                }
            }
        }

        if (words.size() < target) {
            addFallbackWords(target, seen, words);
        }

        if (words.size() < target) {
            throw new IllegalStateException(
                    "Could not fetch " + target + " words (got " + words.size() + ")"
            );
        }

        Collections.shuffle(words);
        return List.copyOf(words.subList(0, target));
    }

    private void addFallbackWords(int target, Set<String> seen, List<String> words) {
        var shuffled = new ArrayList<>(fallbackWords.all());
        Collections.shuffle(shuffled);
        for (var word : shuffled) {
            addIfValid(word, seen, words);
            if (words.size() >= target) {
                return;
            }
        }
    }

    private void addIfValid(String rawWord, Set<String> seen, List<String> words) {
        var normalized = GermanWordNormalizer.normalize(rawWord);
        if (normalized == null) {
            return;
        }

        var key = normalized.toLowerCase(Locale.ROOT);
        if (seen.contains(key)) {
            return;
        }

        seen.add(key);
        words.add(normalized);
    }
}
