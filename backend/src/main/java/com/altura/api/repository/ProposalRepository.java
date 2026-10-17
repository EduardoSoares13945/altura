package com.altura.api.repository;

import com.altura.api.dto.ProposalResponse;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProposalRepository {
    List<ProposalResponse> list(long connectionId);
    Optional<ProposalResponse> find(long proposalId);
    ProposalResponse create(long connectionId, UUID authorId, BigDecimal value, String message);
    boolean accept(long proposalId);
    boolean reject(long proposalId);
    boolean cancel(long proposalId, UUID authorId);
}
