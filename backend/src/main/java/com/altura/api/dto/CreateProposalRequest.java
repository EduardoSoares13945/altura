package com.altura.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateProposalRequest(
        @NotNull @Positive BigDecimal valor,
        @Size(max = 500) String mensagem
) {}
