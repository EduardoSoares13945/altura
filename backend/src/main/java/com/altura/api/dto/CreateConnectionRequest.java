package com.altura.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateConnectionRequest(
        @NotNull @Positive Long captacaoId,
        @DecimalMin("0.01") BigDecimal valorProposto,
        @NotBlank @Size(min = 10, max = 500) String mensagem
) {}
