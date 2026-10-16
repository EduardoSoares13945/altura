package com.altura.api.repository;

import com.altura.api.dto.NotificationResponse;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository {
    void create(UUID recipientId, UUID actorId, String type, long referenceId,
                String title, String message, String destination);
    List<NotificationResponse> list(UUID userId, int limit);
    int unreadCount(UUID userId);
    boolean markRead(UUID userId, long notificationId);
    void markAllRead(UUID userId);
    void deleteAll(UUID userId);
}
