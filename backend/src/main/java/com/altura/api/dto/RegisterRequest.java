package com.altura.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 72)
        @Pattern(regexp = "(?=.*[A-Za-zÀ-ÿ])(?=.*\\d).+", message = "deve conter ao menos uma letra e um número")
        String password,
        @NotBlank @Pattern(regexp = "startup|investidor") String tipo,
        @Size(max = 100) String nome
) {}
