package com.altura.api.service;

import com.altura.api.dto.AuthTokenResponse;
import com.altura.api.dto.LoginRequest;
import com.altura.api.dto.RegisterRequest;
import com.altura.api.exception.ApiException;
import com.altura.api.repository.AuthRepository;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.proc.SecurityContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthServiceTest {
    private AuthService service;

    @BeforeEach
    void setUp() {
        SecretKey key = new SecretKeySpec(
                "test-secret-with-at-least-thirty-two-bytes".getBytes(StandardCharsets.UTF_8),
                "HmacSHA256");
        JwtTokenService tokens = new JwtTokenService(
                new NimbusJwtEncoder(new ImmutableSecret<SecurityContext>(key)), "altura-api", 15);
        service = new AuthService(new FakeAuthRepository(), new BCryptPasswordEncoder(), tokens, 7);
    }

    @Test
    void registersLogsInAndRotatesRefreshToken() {
        RegisterRequest request = new RegisterRequest(
                "startup@altura.local", "Startup123", "startup", "Marina Costa");
        service.register(request);

        AuthTokenResponse login = service.login(new LoginRequest("startup@altura.local", "Startup123"));
        AuthTokenResponse refreshed = service.refresh(login.refreshToken());

        assertThat(login.accessToken().split("\\.")).hasSize(3);
        assertThat(login.user().tipo()).isEqualTo("startup");
        assertThat(refreshed.refreshToken()).isNotEqualTo(login.refreshToken());
        assertThatThrownBy(() -> service.refresh(login.refreshToken())).isInstanceOf(ApiException.class);
    }

    @Test
    void rejectsDuplicateEmail() {
        RegisterRequest request = new RegisterRequest(
                "nova@altura.local", "Senha123", "investidor", "Nova Investidora");

        AuthTokenResponse created = service.register(request);

        assertThat(created.user().email()).isEqualTo("nova@altura.local");
        assertThat(created.user().tipo()).isEqualTo("investidor");
        assertThatThrownBy(() -> service.register(request))
                .isInstanceOfSatisfying(ApiException.class,
                        exception -> assertThat(exception.status().value()).isEqualTo(409));
    }

    private static final class FakeAuthRepository implements AuthRepository {
        private final Map<UUID, AuthUser> users = new HashMap<>();
        private final Map<String, Token> tokens = new HashMap<>();

        @Override
        public Optional<AuthUser> findById(UUID id) {
            return Optional.ofNullable(users.get(id));
        }

        @Override
        public Optional<AuthUser> findByEmail(String email) {
            String normalized = email.trim().toLowerCase(Locale.ROOT);
            return users.values().stream().filter(user -> user.email().equals(normalized)).findFirst();
        }

        @Override
        public AuthUser save(AuthUser user) {
            if (findByEmail(user.email()).isPresent()) throw new IllegalStateException("duplicado");
            AuthUser normalized = new AuthUser(user.id(), user.email().toLowerCase(Locale.ROOT),
                    user.passwordHash(), user.name(), user.type(), user.active());
            users.put(normalized.id(), normalized);
            return normalized;
        }

        @Override
        public void updateName(UUID id, String name) {
            users.computeIfPresent(id, (ignored, user) -> new AuthUser(
                    user.id(), user.email(), user.passwordHash(), name, user.type(), user.active()));
        }

        @Override
        public void saveRefreshToken(UUID userId, String tokenHash, Instant expiresAt) {
            tokens.put(tokenHash, new Token(userId, expiresAt));
        }

        @Override
        public Optional<UUID> consumeRefreshToken(String tokenHash, Instant now) {
            Token token = tokens.remove(tokenHash);
            return token == null || !token.expiresAt().isAfter(now)
                    ? Optional.empty() : Optional.of(token.userId());
        }

        @Override
        public void revokeRefreshToken(String tokenHash, Instant now) {
            tokens.remove(tokenHash);
        }

        private record Token(UUID userId, Instant expiresAt) {}
    }
}
