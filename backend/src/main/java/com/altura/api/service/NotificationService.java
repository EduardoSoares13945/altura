package com.altura.api.service;

import com.altura.api.dto.NotificationResponse;
import com.altura.api.exception.ApiException;
import com.altura.api.repository.AuthRepository;
import com.altura.api.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {
    private final NotificationRepository repository;
    private final AuthRepository authRepository;

    public NotificationService(NotificationRepository repository, AuthRepository authRepository) {
        this.repository = repository;
        this.authRepository = authRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(UUID userId, int requestedLimit) {
        requireActiveUser(userId);
        return repository.list(userId, Math.max(1, Math.min(requestedLimit, 50)));
    }

    @Transactional(readOnly = true)
    public int unreadCount(UUID userId) {
        requireActiveUser(userId);
        return repository.unreadCount(userId);
    }

    @Transactional
    public void markRead(UUID userId, long notificationId) {
        requireActiveUser(userId);
        if (!repository.markRead(userId, notificationId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Notificação não encontrada.");
        }
    }

    @Transactional
    public void markAllRead(UUID userId) {
        requireActiveUser(userId);
        repository.markAllRead(userId);
    }

    @Transactional
    public void deleteAll(UUID userId) {
        requireActiveUser(userId);
        repository.deleteAll(userId);
    }

    public void notify(UUID recipientId, UUID actorId, String type, long referenceId,
                       String title, String message, String destination) {
        repository.create(recipientId, actorId, type, referenceId, title, message, destination);
    }

    private void requireActiveUser(UUID userId) {
        var user = authRepository.findById(userId).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "Usuário da sessão não encontrado."));
        if (!user.active()) throw new ApiException(HttpStatus.FORBIDDEN, "Este usuário está inativo.");
    }
}
