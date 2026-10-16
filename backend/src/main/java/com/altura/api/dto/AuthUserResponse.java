package com.altura.api.dto;

import java.util.UUID;

public record AuthUserResponse(UUID id, String email, String nome, String tipo, boolean ativo) {}
