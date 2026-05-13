package com.survivalkit.backend.core.security;

import com.survivalkit.backend.adapter.postgres.user.UserPersistancePort;
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
    private final UserPersistancePort userPersistancePort;

    public TokenService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs, UserPersistancePort userPersistancePort
    ) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
        this.userPersistancePort = userPersistancePort;
    }

    public String generateToken(String userId, RoleLevel role, String email, String username) {
        var now = System.currentTimeMillis();
        return Jwts.builder()
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

            var role = RoleLevel.valueOf(claims.get("role", String.class));

            var user = userPersistancePort.getById(claims.getSubject());
            return user.map(userModel -> new AuthenticatedUser(
                    token,
                    claims.getSubject(),
                    userModel.username(),
                    role,
                    claims.get("email", String.class),
                    userModel.isVerified()
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