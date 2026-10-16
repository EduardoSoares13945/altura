package com.altura.api.dto;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        long id,
        String tipo,
        String titulo,
        String mensagem,
        UUID atorId,
        String atorNome,
        String atorTipo,
        String atorImagem,
        String destino,
        boolean lida,
        Instant criadoEm
) {}
