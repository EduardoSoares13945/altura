package com.altura.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record InvestorProfileRequest(
        @NotBlank @Size(min = 2, max = 100) String nome,
        @NotBlank @Pattern(regexp = "\\d{11}") String cpf,
        @NotBlank @Size(max = 30) String tipo,
        @NotBlank @Size(min = 10, max = 500) String biografia,
        @NotEmpty List<@Positive Long> segmentos,
        @Size(max = 500) String linkedinUrl,
        @Size(max = 120) String localizacao,
        @NotBlank @Size(max = 100) String cidade,
        @NotBlank @Pattern(regexp = "AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO") String estado,
        Double latitude,
        Double longitude,
        @Size(max = 500000) String imagemPerfil
) {
    public InvestorProfileRequest {
        segmentos = segmentos == null ? List.of() : List.copyOf(segmentos);
    }
}
