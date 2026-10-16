package com.altura.api.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface AuthRepository {
    Optional<AuthUser> findById(UUID id);

    Optional<AuthUser> findByEmail(String email);

    AuthUser save(AuthUser user);

    void updateName(UUID id, String name);

    void saveRefreshToken(UUID userId, String tokenHash, Instant expiresAt);

    Optional<UUID> consumeRefreshToken(String tokenHash, Instant now);

    void revokeRefreshToken(String tokenHash, Instant now);

    record AuthUser(
            UUID id,
            String email,
            String passwordHash,
            String name,
            String type,
            boolean active
    ) {}
}
