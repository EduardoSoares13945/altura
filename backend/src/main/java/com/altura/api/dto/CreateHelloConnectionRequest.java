package com.altura.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateHelloConnectionRequest(
        @NotNull UUID investorUserId,
        @NotBlank @Size(min = 10, max = 500) String mensagem
) {}
