package com.altura.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateConnectionStatusRequest(
        @NotBlank @Pattern(regexp = "aceito|recusado") String status
) {}
