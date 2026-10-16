package com.altura.api.repository;

import com.altura.api.dto.CreatePostRequest;
import com.altura.api.dto.FeedCommentResponse;
import com.altura.api.dto.FeedPostResponse;
import com.altura.api.dto.LikeResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeedRepository {
    List<FeedPostResponse> list(UUID viewerId, int limit);
    List<FeedPostResponse> listByAuthor(UUID viewerId, UUID authorId, int limit);
    Optional<FeedPostResponse> findById(UUID viewerId, long postId);
    Optional<UUID> authorId(long postId);
    FeedPostResponse create(UUID userId, CreatePostRequest request, String imageKey);
    String findOwnedImageKey(UUID userId, long postId);
    boolean deleteOwned(UUID userId, long postId);
    LikeResponse toggleLike(UUID userId, long postId);
    FeedCommentResponse addComment(UUID userId, long postId, String content);
    boolean exists(long postId);
}
