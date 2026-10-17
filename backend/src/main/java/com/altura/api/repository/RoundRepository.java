package com.altura.api.repository;

import com.altura.api.dto.CreateRoundRequest;
import com.altura.api.dto.DashboardSummaryResponse;
import com.altura.api.dto.ManagedRoundResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoundRepository {
    List<ManagedRoundResponse> listOwned(UUID startupUserId);
    Optional<ManagedRoundResponse> findOwned(UUID startupUserId, long roundId);
    ManagedRoundResponse create(UUID startupUserId, CreateRoundRequest request);
    boolean update(UUID startupUserId, long roundId, CreateRoundRequest request);
    boolean updateStatus(UUID startupUserId, long roundId, String status);
    boolean hasAcceptedProposal(long roundId);
    DashboardSummaryResponse dashboard(UUID userId, String type);
}
