package com.altura.api.dto;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
        String tipo,
        int quantidadePrincipal,
        BigDecimal valorTotal
) {}
