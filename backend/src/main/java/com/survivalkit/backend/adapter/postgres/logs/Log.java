package com.survivalkit.backend.adapter.postgres.logs;

import java.time.Instant;

public record Log(
    SecurityLogType type,
    SecurityLogSubType subType,
    Instant timestamp,
    String message
) {

    public enum SecurityLogType{
        INFO,
        WARNING,
        ERROR
    }

    public enum SecurityLogSubType {
        AUTH,
        API,
        RAPLA,
        UNCATEGORIZED,
        DATABASE
    }
}
