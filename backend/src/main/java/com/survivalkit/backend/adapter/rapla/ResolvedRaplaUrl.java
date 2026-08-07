package com.survivalkit.backend.adapter.rapla;

import java.util.Optional;

public record ResolvedRaplaUrl(
        String url,
        String adapterId,
        Optional<String> notice
) {}
