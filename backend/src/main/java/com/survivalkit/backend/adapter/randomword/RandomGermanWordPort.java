package com.survivalkit.backend.adapter.randomword;

import java.util.List;

public interface RandomGermanWordPort {

    /**
     * Fetches random German words from the external word API.
     *
     * @param count number of words to fetch (capped internally)
     * @return normalized unique words; may contain fewer than {@code count} entries if the API fails
     */
    List<String> fetchRandomWords(int count);
}
