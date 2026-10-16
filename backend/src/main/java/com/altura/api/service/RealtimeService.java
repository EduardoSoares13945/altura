package com.altura.api.service;

import com.altura.api.realtime.RealtimeEvent;
import com.altura.api.realtime.RealtimeWebSocketHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

@Service
public class RealtimeService {
    private final RealtimeWebSocketHandler handler;

    public RealtimeService(RealtimeWebSocketHandler handler) {
        this.handler = handler;
    }

    public void sendAfterCommit(UUID recipientId, RealtimeEvent event) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    handler.send(recipientId, event);
                }
            });
            return;
        }
        handler.send(recipientId, event);
    }
}
