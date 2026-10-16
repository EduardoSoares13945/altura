package com.altura.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreatePostRequest(
        @NotBlank @Size(min = 3, max = 1500) String conteudo,
        @NotBlank @Pattern(regexp = "atualizacao|conquista|rodada|insight") String categoria,
        @Size(max = 40) String metricaRotulo,
        @Size(max = 80) String metricaValor,
        @Pattern(regexp = "^[A-Za-z0-9_-]{11}$", message = "Informe um vídeo válido do YouTube.")
        String youtubeVideoId
) {}
