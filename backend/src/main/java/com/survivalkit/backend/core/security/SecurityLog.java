package com.survivalkit.backend.core.security;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.shared.Page;

public interface SecurityLog {

    void logInfo(ErrorCode.ErrorCategory subType, String message);
    void logWarning(ErrorCode.ErrorCategory subType, String message);
    void logError(ErrorCode.ErrorCategory subType, String message);
    Page<Log> getLogs(Integer pageSize, String continuation);
}
