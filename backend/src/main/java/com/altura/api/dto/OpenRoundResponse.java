package com.altura.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record OpenRoundResponse(
        long id,
        long startupId,
        BigDecimal valorAlvo,
        BigDecimal valorCaptado,
        BigDecimal percentualEquityOferecido,
        String status,
        LocalDate dataInicio,
        StartupData startup
) {
    public record StartupData(
            long id,
            UUID usuarioId,
            String nomeStartup,
            String fase,
            long segmentoId,
            String segmentoNome,
            String descricao,
            LocalDate dataFundacao,
            String siteUrl,
            String cidade,
            String estado,
            String videoPitchUrl,
            String linkedinUrl,
            String imagemPerfil,
            List<String> segmentosSecundarios,
            StartupProfileResponse.TractionData tracao
    ) {}
}
