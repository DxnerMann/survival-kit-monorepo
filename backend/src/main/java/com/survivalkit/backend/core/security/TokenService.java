package com.survivalkit.backend.core.security;

import com.survivalkit.backend.core.auth.AuthenticatedUser;
import com.survivalkit.backend.shared.RoleLevel;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.security.Key;
import java.util.Date;
import java.util.Optional;

@Service
public class TokenService {

    private final Key signingKey;
    private final long expirationMs;

    public TokenService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs
    ) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
    }

    public String generateToken(String userId, RoleLevel role, String email) {
        var now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(userId)
                .claim("role", role.name())
                .claim("email", email)
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

            var role = RoleLevel.valueOf(claims.get("role", String.class));

            return Optional.of(new AuthenticatedUser(
                    claims.getSubject(),
                    role,
                    claims.get("email", String.class)
            ));

        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public String extractEmail(String token) {
        return Jwts.parser()
                .verifyWith((SecretKey) signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .get("email", String.class);
    }
}