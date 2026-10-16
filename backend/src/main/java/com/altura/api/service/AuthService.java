package com.altura.api.service;

import com.altura.api.dto.AuthTokenResponse;
import com.altura.api.dto.AuthUserResponse;
import com.altura.api.dto.LoginRequest;
import com.altura.api.dto.RegisterRequest;
import com.altura.api.exception.ApiException;
import com.altura.api.repository.AuthRepository;
import com.altura.api.repository.AuthRepository.AuthUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class AuthService {
    private final AuthRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final Duration refreshDuration;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            AuthRepository repository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            @Value("${app.security.jwt.refresh-token-days}") long refreshTokenDays
    ) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.refreshDuration = Duration.ofDays(refreshTokenDays);
    }

    @Transactional
    public AuthTokenResponse login(LoginRequest request) {
        AuthUser user = repository.findByEmail(request.email()).orElseThrow(this::invalidCredentials);
        if (!user.active() || !passwordEncoder.matches(request.password(), user.passwordHash())) {
            throw invalidCredentials();
        }
        return issueSession(user);
    }

    @Transactional
    public AuthTokenResponse register(RegisterRequest request) {
        if (repository.findByEmail(request.email()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Este e-mail já está cadastrado. Tente entrar.");
        }
        String defaultName = request.email().substring(0, request.email().indexOf('@'));
        AuthUser user = new AuthUser(
                UUID.randomUUID(), request.email(), passwordEncoder.encode(request.password()),
                request.nome() == null || request.nome().isBlank() ? defaultName : request.nome(),
                request.tipo(), true);
        AuthUser saved;
        try {
            saved = repository.save(user);
        } catch (IllegalStateException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "Este e-mail já está cadastrado. Tente entrar.");
        }
        return issueSession(saved);
    }

    @Transactional
    public AuthTokenResponse refresh(String refreshToken) {
        Instant now = Instant.now();
        UUID userId = repository.consumeRefreshToken(hashToken(refreshToken), now)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED,
                        "Sessão expirada. Entre novamente."));
        AuthUser user = repository.findById(userId).orElseThrow(this::invalidCredentials);
        return issueSession(user);
    }

    @Transactional
    public void logout(String refreshToken) {
        repository.revokeRefreshToken(hashToken(refreshToken), Instant.now());
    }

    private AuthTokenResponse issueSession(AuthUser user) {
        JwtTokenService.IssuedToken access = jwtTokenService.issue(user);
        String refreshToken = newRefreshToken();
        repository.saveRefreshToken(user.id(), hashToken(refreshToken), Instant.now().plus(refreshDuration));
        return new AuthTokenResponse(access.value(), refreshToken, access.expiresIn(), toResponse(user));
    }

    private String newRefreshToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 não está disponível.", exception);
        }
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos.");
    }

    private AuthUserResponse toResponse(AuthUser user) {
        return new AuthUserResponse(user.id(), user.email(), user.name(), user.type(), user.active());
    }
}
