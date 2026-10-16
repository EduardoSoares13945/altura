package com.altura.api.repository;

import com.altura.api.dto.ConnectionResponse;
import com.altura.api.dto.CreateConnectionRequest;
import com.altura.api.dto.MessageResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConnectionRepository {
    List<ConnectionResponse> list(UUID userId);
    Optional<ConnectionResponse> findById(UUID userId, long connectionId);
    boolean openRoundExists(long captacaoId);
    boolean existsForRoundAndInvestor(long captacaoId, UUID investorUserId);
    ConnectionResponse create(UUID investorUserId, CreateConnectionRequest request);
    boolean updateStatus(long connectionId, UUID startupUserId, String status);
    List<MessageResponse> messages(long connectionId, UUID viewerId);
    MessageResponse addMessage(long connectionId, UUID senderId, String content);
    boolean delete(long connectionId, UUID userId);
}
