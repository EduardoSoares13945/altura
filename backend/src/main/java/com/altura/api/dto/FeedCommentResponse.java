package com.altura.api.dto;

import java.time.Instant;
import java.util.UUID;

public record FeedCommentResponse(
        long id,
        UUID autorId,
        String autorNome,
        String autorTipo,
        String autorImagem,
        String conteudo,
        Instant criadoEm
) {}
