package com.altura.api.dto;

import java.time.Instant;
import java.util.UUID;

public record MessageResponse(
        long id,
        UUID remetenteId,
        String remetenteNome,
        String conteudo,
        Instant criadoEm,
        boolean lida
) {}
