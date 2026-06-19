package com.survivalkit.backend.adapter.postgres.logs;

import com.survivalkit.backend.shared.Page;

public interface SecurityLogPersistancePort {

    void saveLog(Log log);
    Page<Log> getLatestLogs(int pageSize, String continuation);
    void deleteOlderThan7Days();
}
