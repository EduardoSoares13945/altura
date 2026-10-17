package com.altura.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProposalResponse(
        long id,
        long connectionId,
        UUID autorUsuarioId,
        String autorNome,
        BigDecimal valor,
        String mensagem,
        String status,
        Instant criadaEm,
        Instant respondidaEm
) {}
