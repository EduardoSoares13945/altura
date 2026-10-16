package com.altura.api.dto;

import java.util.List;

public record InvestorProfileResponse(
        String nome,
        String cpf,
        String tipo,
        String biografia,
        List<Long> segmentos,
        String linkedinUrl,
        String localizacao,
        String cidade,
        String estado,
        Double latitude,
        Double longitude,
        String imagemPerfil
) {}
