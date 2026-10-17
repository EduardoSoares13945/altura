package com.altura.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ManagedRoundResponse(
        long id,
        BigDecimal valorAlvo,
        BigDecimal valorCaptado,
        BigDecimal percentualEquityOferecido,
        String status,
        LocalDate dataInicio,
        LocalDate dataFim,
        int propostas,
        int propostasPendentes
) {}
