package com.survivalkit.backend.core.security;

import com.survivalkit.backend.adapter.postgres.logs.Log;
import com.survivalkit.backend.adapter.postgres.logs.SecurityLogPersistancePort;
import com.survivalkit.backend.shared.Page;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class SecurityLogService implements SecurityLog {

    private final SecurityLogPersistancePort securityLogPersistancePort;

    public SecurityLogService(SecurityLogPersistancePort securityLogPersistancePort) {
        this.securityLogPersistancePort = securityLogPersistancePort;
    }


    @Override
    public void logInfo(Log.SecurityLogSubType subType, String message) {
        securityLogPersistancePort.saveLog(new Log(
                Log.SecurityLogType.INFO,
                subType,
                Instant.now(),
                message
        ));
    }

    @Override
    public void logWarning(Log.SecurityLogSubType subType, String message) {
        securityLogPersistancePort.saveLog(new Log(
                Log.SecurityLogType.WARNING,
                subType,
                Instant.now(),
                message
        ));
    }

    @Override
    public void logError(Log.SecurityLogSubType subType, String message) {
        securityLogPersistancePort.saveLog(new Log(
                Log.SecurityLogType.ERROR,
                subType,
                Instant.now(),
                message
        ));
    }

    @Override
    public Page<Log> getLogs(Integer pageSize, String continuation) {
        pageSize = pageSize == null ? 50 : pageSize;
        pageSize = pageSize > 50 ? 50 : pageSize;

        return securityLogPersistancePort.getLatestLogs(pageSize, continuation);
    }

    @Scheduled(cron = "0 0 * * * *")
    public void cleanupLogs() {
        securityLogPersistancePort.deleteOlderThan7Days();
    }
}
