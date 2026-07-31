package com.survivalkit.backend.adapter.postgres.logs;

import java.time.Instant;

public record Log(
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
