package com.altura.api.dto;

import java.time.LocalDate;
import java.util.List;

public record StartupDetailsResponse(
        long id,
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
        StartupProfileResponse.TractionData tracao,
        StartupProfileResponse.RoundData rodada
) {}
