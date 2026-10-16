package com.altura.api.dto;

import java.util.List;

public record InvestorDetailsResponse(
        String nome,
        String tipo,
        String biografia,
        List<String> segmentos,
        String linkedinUrl,
        String cidade,
        String estado,
        String imagemPerfil
) {}
