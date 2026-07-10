package com.survivalkit.backend.adapter.postgres.logs;

import com.survivalkit.backend.adapter.web.ErrorCode;

import java.time.Instant;

public record Log(
    SecurityLogType type,
    ErrorCode.ErrorCategory subType,
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
