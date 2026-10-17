package com.altura.api.service;

import com.altura.api.dto.CreateCommentRequest;
import com.altura.api.dto.CreatePostRequest;
import com.altura.api.dto.FeedCommentResponse;
import com.altura.api.dto.FeedPostResponse;
import com.altura.api.dto.LikeResponse;
import com.altura.api.exception.ApiException;
import com.altura.api.repository.AuthRepository;
import com.altura.api.repository.AuthRepository.AuthUser;
import com.altura.api.repository.FeedRepository;
import com.altura.api.repository.ProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
public class FeedService {
    private final FeedRepository repository;
    private final AuthRepository authRepository;
    private final ProfileRepository profileRepository;
    private final FeedImageStorage imageStorage;
    private final NotificationService notificationService;

    public FeedService(FeedRepository repository, AuthRepository authRepository,
                       ProfileRepository profileRepository, FeedImageStorage imageStorage,
                       NotificationService notificationService) {
        this.repository = repository;
        this.authRepository = authRepository;
        this.profileRepository = profileRepository;
        this.imageStorage = imageStorage;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<FeedPostResponse> list(UUID userId, int requestedLimit) {
        requireMember(userId);
        int limit = Math.max(1, Math.min(requestedLimit, 50));
        return repository.list(userId, limit);
    }

    @Transactional(readOnly = true)
    public List<FeedPostResponse> listByStartup(UUID userId, UUID startupUserId, int requestedLimit) {
        requireMember(userId);
        int limit = Math.max(1, Math.min(requestedLimit, 50));
        return repository.listByAuthor(userId, startupUserId, limit);
    }

    @Transactional
    public FeedPostResponse create(UUID userId, CreatePostRequest request) {
        return create(userId, request, null);
    }

    @Transactional
    public FeedPostResponse createWithImage(UUID userId, CreatePostRequest request, MultipartFile image) {
        return create(userId, request, image);
    }

    private FeedPostResponse create(UUID userId, CreatePostRequest request, MultipartFile image) {
        AuthUser user = requireMember(userId);
        if (!"startup".equals(user.type())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Somente startups podem publicar no feed.");
        }
        boolean hasLabel = request.metricaRotulo() != null && !request.metricaRotulo().isBlank();
        boolean hasValue = request.metricaValor() != null && !request.metricaValor().isBlank();
        if (hasLabel != hasValue) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Para destacar uma métrica, informe o rótulo e o valor.");
        }
        if (image != null && request.youtubeVideoId() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Escolha apenas uma mídia: imagem ou vídeo do YouTube.");
        }

        String imageKey = image == null ? null : imageStorage.store(userId, image);
        try {
            return repository.create(userId, request, imageKey);
        } catch (RuntimeException exception) {
            imageStorage.deleteQuietly(imageKey);
            throw exception;
        }
    }

    @Transactional
    public LikeResponse toggleLike(UUID userId, long postId) {
        requireMember(userId);
        requirePost(postId);
        LikeResponse result = repository.toggleLike(userId, postId);
        if (result.curtido()) {
            repository.authorId(postId).ifPresent(authorId -> notificationService.notify(
                    authorId, userId, "curtida", postId, "Nova curtida",
                    "curtiu sua publicação.", "/startups/" + authorId + "?post=" + postId));
        }
        return result;
    }

    @Transactional
    public FeedCommentResponse comment(UUID userId, long postId, CreateCommentRequest request) {
        requireMember(userId);
        requirePost(postId);
        FeedCommentResponse comment = repository.addComment(userId, postId, request.conteudo());
        repository.authorId(postId).ifPresent(authorId -> notificationService.notify(
                authorId, userId, "comentario", postId, "Novo comentário",
                "comentou na sua publicação.", "/startups/" + authorId + "?post=" + postId));
        return comment;
    }

    @Transactional
    public void delete(UUID userId, long postId) {
        requireMember(userId);
        String imageKey = repository.findOwnedImageKey(userId, postId);
        if (!repository.deleteOwned(userId, postId)) {
            if (!repository.exists(postId)) {
                throw new ApiException(HttpStatus.NOT_FOUND, "Publicação não encontrada.");
            }
            throw new ApiException(HttpStatus.FORBIDDEN, "Você só pode excluir suas próprias publicações.");
        }
        imageStorage.deleteQuietly(imageKey);
    }

    private AuthUser requireMember(UUID userId) {
        AuthUser user = authRepository.findById(userId).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "Usuário da sessão não encontrado."));
        if (!user.active()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Este usuário está inativo.");
        }
        if (!profileRepository.profileExists(userId, user.type())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Conclua seu perfil antes de participar do feed.");
        }
        return user;
    }

    private void requirePost(long postId) {
        if (!repository.exists(postId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Publicação não encontrada.");
        }
    }
}
