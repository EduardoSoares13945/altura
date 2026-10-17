package com.altura.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateRoundStatusRequest(
        @NotBlank @Pattern(regexp = "aberta|encerrada|cancelada") String status
) {}
