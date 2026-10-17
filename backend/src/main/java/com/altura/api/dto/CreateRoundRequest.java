package com.altura.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateRoundRequest(
        @NotNull @Positive BigDecimal valorAlvo,
        @NotNull @DecimalMin("0.1") @DecimalMax("49.9") BigDecimal percentualEquityOferecido,
        @FutureOrPresent LocalDate dataFim
) {}
