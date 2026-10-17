package com.altura.api.dto;

import java.util.List;

public record MatchScoreResponse(
        int percentual,
        int segmentos,
        int investimento,
        int tracao,
        int localizacao,
        List<Reason> motivos
) {
    public record Reason(String texto, boolean positivo) {}
}
