package com.survivalkit.backend.core.security;

import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
import com.survivalkit.backend.core.user.AuthenticatedUser;
import com.survivalkit.backend.shared.RoleLevel;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.viascom.nanoid.NanoId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.security.Key;
import java.time.Duration;
import java.util.Date;
import java.util.Optional;

@Service
public class TokenService {

    private static final String REVOKED_PREFIX = "revoked_jti:";

    private final Key signingKey;
    private final long expirationMs;
    private final UserPersistancePort userPersistancePort;
    private final StringRedisTemplate redisTemplate;

    public TokenService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs, UserPersistancePort userPersistancePort, StringRedisTemplate redisTemplate
    ) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
        this.userPersistancePort = userPersistancePort;
        this.redisTemplate = redisTemplate;
    }

    public String generateToken(String userId, RoleLevel role, String email, String username) {
        var now = System.currentTimeMillis();
        return Jwts.builder()
                .id(NanoId.generate(25))
                .subject(userId)
                .claim("role", role.name())
                .claim("email", email)
                .claim("username", username)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(signingKey)
                .compact();
    }

    public Optional<AuthenticatedUser> validate(String token) {
        try {
            var claims = Jwts.parser()
                    .verifyWith((SecretKey) signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            var jti = claims.getId();
            if (isRevoked(jti)) {
                return Optional.empty();
            }

            var user = userPersistancePort.getById(claims.getSubject());
            return user.map(userModel -> new AuthenticatedUser(
                    token,
                    claims.getSubject(),
                    userModel.username(),
                    userModel.role(),
                    userModel.email(),
                    userModel.isVerified()
            ));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public void revoke(String token) {
        try {
            var claims = Jwts.parser()
                    .verifyWith((SecretKey) signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            var jti = claims.getId();
            var remainingTtl = claims.getExpiration().getTime() - System.currentTimeMillis();

            if (jti != null && remainingTtl > 0) {
                redisTemplate.opsForValue().set(
                        REVOKED_PREFIX + jti,
                        "1",
                        Duration.ofMillis(remainingTtl)
                );
            }
        } catch (JwtException | IllegalArgumentException e) {
        }
    }

    private boolean isRevoked(String jti) {
        return jti != null && Boolean.TRUE.equals(redisTemplate.hasKey(REVOKED_PREFIX + jti));
    }
}