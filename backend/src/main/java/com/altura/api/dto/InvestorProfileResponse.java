package com.altura.api.dto;

import java.util.List;
import java.math.BigDecimal;

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
        String imagemPerfil,
        BigDecimal ticketMin,
        BigDecimal ticketMax
) {}
