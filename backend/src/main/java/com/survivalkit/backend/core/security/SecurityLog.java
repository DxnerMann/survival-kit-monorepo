package com.survivalkit.backend.core.security;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.shared.Page;

public interface SecurityLog {

    void logInfo(Log.SecurityLogSubType subType, String message);
    void logWarning(Log.SecurityLogSubType subType, String message);
    void logError(Log.SecurityLogSubType subType, String message);
    Page<Log> getLogs(Integer pageSize, String continuation);
}
