package com.altura.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FeedPostResponse(
        long id,
        UUID autorId,
        String autorNome,
        String autorTipo,
        String autorDescricao,
        String autorImagem,
        String conteudo,
        String categoria,
        String metricaRotulo,
        String metricaValor,
        String imagemUrl,
        String youtubeVideoId,
        Instant criadoEm,
        int curtidas,
        boolean curtidoPorMim,
        boolean meuPost,
        List<FeedCommentResponse> comentarios
) {}
