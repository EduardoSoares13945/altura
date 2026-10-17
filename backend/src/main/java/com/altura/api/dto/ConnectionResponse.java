package com.altura.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ConnectionResponse(
        long id,
        String status,
        UUID solicitanteUsuarioId,
        BigDecimal valorProposto,
        String mensagemInicial,
        Instant criadoEm,
        Instant atualizadoEm,
        int naoLidas,
        PersonData contraparte,
        RoundData rodada
) {
    public record PersonData(
            UUID usuarioId,
            String nome,
            String tipo,
            String tipoInvestidor,
            String nomeResponsavel,
            String imagemPerfil
    ) {}
    public record RoundData(long captacaoId, long startupId, String startupNome) {}
}
