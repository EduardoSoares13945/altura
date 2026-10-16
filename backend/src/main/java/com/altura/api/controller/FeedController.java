package com.altura.api.controller;

import com.altura.api.dto.CreateCommentRequest;
import com.altura.api.dto.CreatePostRequest;
import com.altura.api.dto.FeedCommentResponse;
import com.altura.api.dto.FeedPostResponse;
import com.altura.api.dto.LikeResponse;
import com.altura.api.exception.ApiException;
import com.altura.api.service.FeedService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/feed")
public class FeedController {
    private final FeedService service;

    public FeedController(FeedService service) {
        this.service = service;
    }

    @GetMapping
    List<FeedPostResponse> list(@AuthenticationPrincipal Jwt jwt,
                                @RequestParam(defaultValue = "20") int limit) {
        return service.list(subject(jwt), limit);
    }

    @GetMapping("/startups/{startupUserId}")
    List<FeedPostResponse> listByStartup(@AuthenticationPrincipal Jwt jwt,
                                         @PathVariable UUID startupUserId,
                                         @RequestParam(defaultValue = "20") int limit) {
        return service.listByStartup(subject(jwt), startupUserId, limit);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<FeedPostResponse> create(@AuthenticationPrincipal Jwt jwt,
                                            @Valid @RequestBody CreatePostRequest request) {
        FeedPostResponse post = service.create(subject(jwt), request);
        return ResponseEntity.created(URI.create("/api/feed/" + post.id())).body(post);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<FeedPostResponse> createWithImage(@AuthenticationPrincipal Jwt jwt,
                                                     @Valid @RequestPart("post") CreatePostRequest request,
                                                     @RequestPart("image") MultipartFile image) {
        FeedPostResponse post = service.createWithImage(subject(jwt), request, image);
        return ResponseEntity.created(URI.create("/api/feed/" + post.id())).body(post);
    }

    @PostMapping("/{postId}/like")
    LikeResponse toggleLike(@AuthenticationPrincipal Jwt jwt, @PathVariable long postId) {
        return service.toggleLike(subject(jwt), postId);
    }

    @PostMapping("/{postId}/comments")
    ResponseEntity<FeedCommentResponse> comment(@AuthenticationPrincipal Jwt jwt,
                                                @PathVariable long postId,
                                                @Valid @RequestBody CreateCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.comment(subject(jwt), postId, request));
    }

    @DeleteMapping("/{postId}")
    ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable long postId) {
        service.delete(subject(jwt), postId);
        return ResponseEntity.noContent().build();
    }

    private UUID subject(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token de acesso inválido.");
        }
    }
}
