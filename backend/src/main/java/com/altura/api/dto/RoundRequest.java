package com.altura.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record RoundRequest(
        @NotNull @Positive BigDecimal valorAlvo,
        @NotNull @DecimalMin("0.0") BigDecimal valorCaptado,
        @NotNull @DecimalMin("0.1") @DecimalMax("49.9") BigDecimal percentualEquityOferecido,
        @NotBlank @Pattern(regexp = "aberta|encerrada") String status
) {}
