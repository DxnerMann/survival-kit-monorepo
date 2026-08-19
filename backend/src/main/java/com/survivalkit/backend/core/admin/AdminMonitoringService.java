package com.survivalkit.backend.core.admin;

import com.survivalkit.backend.adapter.postgres.admin.AdminMonitoringRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class AdminMonitoringService implements AdminMonitoringPort {

    private final AdminMonitoringRepository repository;
    private final StringRedisTemplate redisTemplate;

    public AdminMonitoringService(AdminMonitoringRepository repository, StringRedisTemplate redisTemplate) {
        this.repository = repository;
        this.redisTemplate = redisTemplate;
    }

    @Override
    public AdminHealth health() {
        var database = repository.databaseUp();
        var redis = redisUp();
        var flag = database && redis ? "UP" : "DOWN";
        return new AdminHealth(flag, database ? "UP" : "DOWN", redis ? "UP" : "DOWN");
    }

    @Override
    public StorageUsage storage() {
        return repository.measure();
    }

    private boolean redisUp() {
        try {
            redisTemplate.hasKey("__health__");
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }
}
