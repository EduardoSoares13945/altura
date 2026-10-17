package com.altura.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record StartupProfileResponse(
        String nomeResponsavel,
        String nomeStartup,
        String cnpj,
        String fase,
        long segmentoId,
        String descricao,
        String videoPitchUrl,
        LocalDate dataFundacao,
        String siteUrl,
        String localizacao,
        String cidade,
        String estado,
        Double latitude,
        Double longitude,
        String imagemPerfil,
        List<Long> segmentosSecundarios,
        String linkedinUrl,
        RoundData rodada,
        TractionData tracao
) {
    public record RoundData(BigDecimal valorAlvo, BigDecimal valorCaptado, BigDecimal percentualEquityOferecido, String status, LocalDate dataFim) {}
    public record TractionData(String mesReferencia, BigDecimal receitaMensal, BigDecimal mrr, Integer clientesAtivos,
                               Integer pilotosAtivos, BigDecimal crescimentoMensal, String evidenciaTracao) {}
}
