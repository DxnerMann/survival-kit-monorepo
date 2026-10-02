package com.survivalkit.backend.adapter.postgres.logs;

import java.time.Instant;

public record Log(
    String id,
    SecurityLogType type,
    String subType,
    Instant timestamp,
    String message
) {

    public enum SecurityLogType{
        INFO,
        WARNING,
        ERROR
    }
}
