package com.survivalkit.backend.shared;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

public final class ContinuationTokenHelper {

    public static String encode(String token) {
        if (token == null) {
            return null;
        }
        return Base64.getUrlEncoder()
                .encodeToString(token.getBytes(StandardCharsets.UTF_8));
    }

    public static String decode(String token) {
        if (token == null) {
            return null;
        }

        return new String(
                Base64.getUrlDecoder().decode(token),
                StandardCharsets.UTF_8
        );
    }
}
