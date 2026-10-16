package com.altura.api.controller;

import com.altura.api.dto.NotificationResponse;
import com.altura.api.exception.ApiException;
import com.altura.api.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    List<NotificationResponse> list(@AuthenticationPrincipal Jwt jwt,
                                    @RequestParam(defaultValue = "30") int limit) {
        return service.list(subject(jwt), limit);
    }

    @GetMapping("/unread-count")
    Map<String, Integer> unreadCount(@AuthenticationPrincipal Jwt jwt) {
        return Map.of("naoLidas", service.unreadCount(subject(jwt)));
    }

    @PatchMapping("/{notificationId}/read")
    ResponseEntity<Void> markRead(@AuthenticationPrincipal Jwt jwt,
                                  @PathVariable long notificationId) {
        service.markRead(subject(jwt), notificationId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    ResponseEntity<Void> markAllRead(@AuthenticationPrincipal Jwt jwt) {
        service.markAllRead(subject(jwt));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    ResponseEntity<Void> deleteAll(@AuthenticationPrincipal Jwt jwt) {
        service.deleteAll(subject(jwt));
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
