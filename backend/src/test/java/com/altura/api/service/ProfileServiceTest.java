package com.altura.api.service;

import com.altura.api.dto.InvestorProfileRequest;
import com.altura.api.dto.InvestorProfileResponse;
import com.altura.api.dto.InvestorDetailsResponse;
import com.altura.api.dto.OpenRoundResponse;
import com.altura.api.dto.RoundRequest;
import com.altura.api.dto.SegmentResponse;
import com.altura.api.dto.StartupProfileRequest;
import com.altura.api.dto.StartupProfileResponse;
import com.altura.api.dto.StartupDetailsResponse;
import com.altura.api.dto.TractionRequest;
import com.altura.api.exception.ApiException;
import com.altura.api.repository.AuthRepository;
import com.altura.api.repository.ProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProfileServiceTest {
    private final UUID userId = UUID.randomUUID();
    private FakeProfileRepository repository;
    private ProfileService service;

    @BeforeEach
    void setUp() {
        repository = new FakeProfileRepository();
        service = new ProfileService(repository, new StartupAuthRepository(userId), new MatchCalculator());
    }

    @Test
    void rejectsTractionOlderThanTwelveMonths() {
        StartupProfileRequest request = validRequest(YearMonth.now().minusMonths(13).toString(), true);

        assertThatThrownBy(() -> service.saveStartup(userId, request))
                .isInstanceOfSatisfying(ApiException.class, exception -> {
                    assertThat(exception.status().value()).isEqualTo(400);
                    assertThat(exception.getMessage()).contains("últimos 12 meses");
                });
        assertThat(repository.findStartup(userId)).isEmpty();
    }

    @Test
    void rejectsTractionWithoutARealSignal() {
        StartupProfileRequest request = validRequest(YearMonth.now().toString(), false);

        assertThatThrownBy(() -> service.saveStartup(userId, request))
                .isInstanceOfSatisfying(ApiException.class, exception -> {
                    assertThat(exception.status().value()).isEqualTo(400);
                    assertThat(exception.getMessage()).contains("sinal real de tração");
                });
        assertThat(repository.findStartup(userId)).isEmpty();
    }

    private StartupProfileRequest validRequest(String referenceMonth, boolean withSignal) {
        TractionRequest traction = new TractionRequest(
                referenceMonth, withSignal ? new BigDecimal("12000") : BigDecimal.ZERO,
                null, null, null, null,
                "Receita validada com contratos recorrentes ativos.");
        return new StartupProfileRequest(
                "Responsável", "Startup Teste", "12345678000199", "Tração", 1L, List.of(2L),
                "Descrição válida da startup.", null, LocalDate.now().minusYears(2),
                "https://example.com", null, null, "Recife", "PE", null, null, null,
                new RoundRequest(new BigDecimal("500000"), BigDecimal.ZERO,
                        new BigDecimal("10"), "aberta", null), traction);
    }

    private static final class FakeProfileRepository implements ProfileRepository {
        private StartupProfileResponse startup;

        @Override public boolean profileExists(UUID userId, String type) { return startup != null; }
        @Override public List<SegmentResponse> listSegments() { return List.of(); }
        @Override public StartupProfileResponse saveStartup(UUID userId, StartupProfileRequest request) {
            throw new AssertionError("Perfil inválido não deveria ser salvo.");
        }
        @Override public Optional<StartupProfileResponse> findStartup(UUID userId) {
            return Optional.ofNullable(startup);
        }
        @Override public Optional<StartupDetailsResponse> findStartupDetails(UUID userId) {
            return Optional.empty();
        }
        @Override public void deleteStartup(UUID userId) { startup = null; }
        @Override public InvestorProfileResponse saveInvestor(UUID userId, InvestorProfileRequest request) {
            throw new UnsupportedOperationException();
        }
        @Override public Optional<InvestorProfileResponse> findInvestor(UUID userId) { return Optional.empty(); }
        @Override public Optional<InvestorDetailsResponse> findInvestorDetails(UUID userId) { return Optional.empty(); }
        @Override public void deleteInvestor(UUID userId) {}
        @Override public List<OpenRoundResponse> listOpenRounds() { return List.of(); }
    }

    private static final class StartupAuthRepository implements AuthRepository {
        private AuthUser user;

        private StartupAuthRepository(UUID userId) {
            user = new AuthUser(userId, "teste@altura.local", "hash", "Responsável", "startup", true);
        }

        @Override public Optional<AuthUser> findById(UUID id) { return Optional.ofNullable(user); }
        @Override public Optional<AuthUser> findByEmail(String email) { return Optional.ofNullable(user); }
        @Override public AuthUser save(AuthUser value) { user = value; return value; }
        @Override public void updateName(UUID id, String name) {}
        @Override public void saveRefreshToken(UUID userId, String tokenHash, Instant expiresAt) {}
        @Override public Optional<UUID> consumeRefreshToken(String tokenHash, Instant now) { return Optional.empty(); }
        @Override public void revokeRefreshToken(String tokenHash, Instant now) {}
    }
}
