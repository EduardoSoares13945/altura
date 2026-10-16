package com.altura.api.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface FeedImageStorage {
    String store(UUID ownerId, MultipartFile file);
    String signedUrl(String key);
    void deleteQuietly(String key);
}
