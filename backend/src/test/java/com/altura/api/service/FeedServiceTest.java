package com.altura.api.service;

import com.altura.api.dto.CreateCommentRequest;
import com.altura.api.dto.CreatePostRequest;
import com.altura.api.dto.FeedCommentResponse;
import com.altura.api.dto.FeedPostResponse;
import com.altura.api.dto.InvestorProfileRequest;
import com.altura.api.dto.InvestorProfileResponse;
import com.altura.api.dto.InvestorDetailsResponse;
import com.altura.api.dto.LikeResponse;
import com.altura.api.dto.OpenRoundResponse;
import com.altura.api.dto.SegmentResponse;
import com.altura.api.dto.StartupProfileRequest;
import com.altura.api.dto.StartupProfileResponse;
import com.altura.api.dto.StartupDetailsResponse;
import com.altura.api.exception.ApiException;
import com.altura.api.repository.AuthRepository;
import com.altura.api.repository.FeedRepository;
import com.altura.api.repository.ProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class FeedServiceTest {
    private final UUID userId = UUID.randomUUID();
    private FakeFeedRepository feedRepository;
    private FeedService service;

    @BeforeEach
    void setUp() {
        feedRepository = new FakeFeedRepository();
        service = new FeedService(feedRepository, new MemberAuthRepository(userId),
                new CompleteProfileRepository(), mock(FeedImageStorage.class),
                mock(NotificationService.class));
    }

    @Test
    void requiresMetricLabelAndValueTogether() {
        CreatePostRequest request = new CreatePostRequest(
                "Crescemos de forma consistente.", "conquista", "MRR", null, null);

        assertThatThrownBy(() -> service.create(userId, request))
                .isInstanceOfSatisfying(ApiException.class, exception -> {
                    assertThat(exception.status().value()).isEqualTo(400);
                    assertThat(exception.getMessage()).contains("rótulo e o valor");
                });
    }

    @Test
    void limitsFeedPageSizeToFifty() {
        service.list(userId, 500);
        assertThat(feedRepository.receivedLimit).isEqualTo(50);
    }

    @Test
    void preventsDeletingAnotherAuthorsPost() {
        feedRepository.postExists = true;

        assertThatThrownBy(() -> service.delete(userId, 42L))
                .isInstanceOfSatisfying(ApiException.class, exception ->
                        assertThat(exception.status().value()).isEqualTo(403));
    }

    @Test
    void preventsInvestorFromPublishing() {
        service = new FeedService(feedRepository,
                new MemberAuthRepository(userId, "investidor"), new CompleteProfileRepository(),
                mock(FeedImageStorage.class), mock(NotificationService.class));
        CreatePostRequest request = new CreatePostRequest(
                "Uma tese que não deve ser publicada.", "insight", null, null, null);

        assertThatThrownBy(() -> service.create(userId, request))
                .isInstanceOfSatisfying(ApiException.class, exception -> {
                    assertThat(exception.status().value()).isEqualTo(403);
                    assertThat(exception.getMessage()).contains("Somente startups");
                });
    }

    private static final class FakeFeedRepository implements FeedRepository {
        private int receivedLimit;
        private boolean postExists;

        @Override public List<FeedPostResponse> list(UUID viewerId, int limit) {
            receivedLimit = limit;
            return List.of();
        }
        @Override public List<FeedPostResponse> listByAuthor(UUID viewerId, UUID authorId, int limit) {
            receivedLimit = limit;
            return List.of();
        }
        @Override public Optional<FeedPostResponse> findById(UUID viewerId, long postId) {
            return Optional.empty();
        }
        @Override public Optional<UUID> authorId(long postId) { return Optional.empty(); }
        @Override public FeedPostResponse create(UUID userId, CreatePostRequest request, String imageKey) {
            return new FeedPostResponse(1L, userId, "Startup", "startup", "Tração", null,
                    request.conteudo(), request.categoria(), request.metricaRotulo(),
                    request.metricaValor(), null, request.youtubeVideoId(), Instant.now(),
                    0, false, true, List.of());
        }
        @Override public String findOwnedImageKey(UUID userId, long postId) { return null; }
        @Override public boolean deleteOwned(UUID userId, long postId) { return false; }
        @Override public LikeResponse toggleLike(UUID userId, long postId) { return new LikeResponse(true, 1); }
        @Override public FeedCommentResponse addComment(UUID userId, long postId, String content) {
            return new FeedCommentResponse(1L, userId, "Startup", "startup", null, content, Instant.now());
        }
        @Override public boolean exists(long postId) { return postExists; }
    }

    private static final class CompleteProfileRepository implements ProfileRepository {
        @Override public boolean profileExists(UUID userId, String type) { return true; }
        @Override public List<SegmentResponse> listSegments() { return List.of(); }
        @Override public StartupProfileResponse saveStartup(UUID userId, StartupProfileRequest request) { throw new UnsupportedOperationException(); }
        @Override public Optional<StartupProfileResponse> findStartup(UUID userId) { return Optional.empty(); }
        @Override public Optional<StartupDetailsResponse> findStartupDetails(UUID userId) { return Optional.empty(); }
        @Override public void deleteStartup(UUID userId) {}
        @Override public InvestorProfileResponse saveInvestor(UUID userId, InvestorProfileRequest request) { throw new UnsupportedOperationException(); }
        @Override public Optional<InvestorProfileResponse> findInvestor(UUID userId) { return Optional.empty(); }
        @Override public Optional<InvestorDetailsResponse> findInvestorDetails(UUID userId) { return Optional.empty(); }
        @Override public void deleteInvestor(UUID userId) {}
        @Override public List<OpenRoundResponse> listOpenRounds() { return List.of(); }
    }

    private static final class MemberAuthRepository implements AuthRepository {
        private final AuthUser user;

        private MemberAuthRepository(UUID id) {
            this(id, "startup");
        }

        private MemberAuthRepository(UUID id, String type) {
            user = new AuthUser(id, "member@altura.local", "hash", "Member", type, true);
        }

        @Override public Optional<AuthUser> findById(UUID id) { return Optional.of(user); }
        @Override public Optional<AuthUser> findByEmail(String email) { return Optional.of(user); }
        @Override public AuthUser save(AuthUser value) { return value; }
        @Override public void updateName(UUID id, String name) {}
        @Override public void saveRefreshToken(UUID userId, String tokenHash, Instant expiresAt) {}
        @Override public Optional<UUID> consumeRefreshToken(String tokenHash, Instant now) { return Optional.empty(); }
        @Override public void revokeRefreshToken(String tokenHash, Instant now) {}
    }
}
