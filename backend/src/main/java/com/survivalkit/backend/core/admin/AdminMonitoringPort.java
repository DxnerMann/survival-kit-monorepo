package com.survivalkit.backend.core.admin;

public interface AdminMonitoringPort {

    AdminHealth health();

    StorageUsage storage();
}
