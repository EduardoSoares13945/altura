package com.altura.api.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RealtimeWebSocketHandler extends TextWebSocketHandler {
    public static final String USER_ID_ATTRIBUTE = "alturaUserId";

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<UUID, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    public RealtimeWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        UUID userId = (UUID) session.getAttributes().get(USER_ID_ATTRIBUTE);
        if (userId == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Sessão sem usuário autenticado."));
            return;
        }
        sessions.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        UUID userId = (UUID) session.getAttributes().get(USER_ID_ATTRIBUTE);
        if (userId == null) return;
        Set<WebSocketSession> userSessions = sessions.get(userId);
        if (userSessions == null) return;
        userSessions.remove(session);
        if (userSessions.isEmpty()) sessions.remove(userId, userSessions);
    }

    public void send(UUID recipientId, RealtimeEvent event) {
        Set<WebSocketSession> userSessions = sessions.get(recipientId);
        if (userSessions == null || userSessions.isEmpty()) return;
        try {
            TextMessage payload = new TextMessage(objectMapper.writeValueAsString(event));
            for (WebSocketSession session : userSessions) sendIfOpen(session, payload);
        } catch (IOException ignored) {
            // A persistência já foi confirmada; uma reconciliação REST recupera o estado depois.
        }
    }

    private void sendIfOpen(WebSocketSession session, TextMessage payload) {
        if (!session.isOpen()) return;
        try {
            synchronized (session) {
                if (session.isOpen()) session.sendMessage(payload);
            }
        } catch (IOException ignored) {
            // A sessão será removida no callback de fechamento.
        }
    }
}
