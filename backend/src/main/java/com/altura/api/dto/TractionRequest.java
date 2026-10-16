package com.altura.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record TractionRequest(
        @NotBlank @Pattern(regexp = "\\d{4}-\\d{2}") String mesReferencia,
        @DecimalMin("0.0") BigDecimal receitaMensal,
        @DecimalMin("0.0") BigDecimal mrr,
        @Min(0) Integer clientesAtivos,
        @Min(0) Integer pilotosAtivos,
        @DecimalMin("-100.0") @DecimalMax("1000.0") BigDecimal crescimentoMensal,
        @NotBlank @Size(min = 20, max = 500) String evidenciaTracao
) {
    public boolean hasRealSignal() {
        return positive(receitaMensal) || positive(mrr)
                || (clientesAtivos != null && clientesAtivos > 0)
                || (pilotosAtivos != null && pilotosAtivos > 0);
    }

    private static boolean positive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }
}
