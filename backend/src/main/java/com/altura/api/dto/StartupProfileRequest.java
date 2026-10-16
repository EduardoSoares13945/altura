package com.altura.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record StartupProfileRequest(
        @NotBlank @Size(min = 2, max = 100) String nomeResponsavel,
        @NotBlank @Size(min = 2, max = 100) String nomeStartup,
        @NotBlank @Pattern(regexp = "\\d{14}") String cnpj,
        @NotBlank @Pattern(regexp = "Tração") String fase,
        @NotNull @Positive Long segmentoId,
        List<@Positive Long> segmentosSecundarios,
        @NotBlank @Size(min = 10, max = 500) String descricao,
        @Size(max = 500) String videoPitchUrl,
        @NotNull LocalDate dataFundacao,
        @Size(max = 500) String siteUrl,
        @Size(max = 500) String linkedinUrl,
        @Size(max = 120) String localizacao,
        @NotBlank @Size(max = 100) String cidade,
        @NotBlank @Pattern(regexp = "AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO") String estado,
        Double latitude,
        Double longitude,
        @Size(max = 500000) String imagemPerfil,
        @NotNull @Valid RoundRequest rodada,
        @NotNull @Valid TractionRequest tracao
) {
    public StartupProfileRequest {
        segmentosSecundarios = segmentosSecundarios == null ? List.of() : List.copyOf(segmentosSecundarios);
    }
}
