package com.altura.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateProposalStatusRequest(
        @NotBlank @Pattern(regexp = "aceita|recusada") String status
) {}
