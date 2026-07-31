package com.survivalkit.backend.core.security;

import com.survivalkit.backend.adapter.web.ErrorCode;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RateLimitService {

    private final StringRedisTemplate redisTemplate;

    public RateLimitService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void check(String bucket, String clientKey, int maxRequests, Duration window) {
        var redisKey = "rate:" + bucket + ":" + clientKey;
        var count = redisTemplate.opsForValue().increment(redisKey);

        if (count == null) {
            throw new RateLimitExceededException(ErrorCode.RATE_LIMIT_EXCEEDED.getCode());
        }

        if (count == 1L) {
            redisTemplate.expire(redisKey, window);
        }

        if (count > maxRequests) {
            throw new RateLimitExceededException(ErrorCode.RATE_LIMIT_EXCEEDED.getCode());
        }
    }
}
