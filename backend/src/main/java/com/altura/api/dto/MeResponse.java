package com.altura.api.dto;

import java.util.UUID;

public record MeResponse(UUID id, String nome, String tipo, boolean ativo, boolean perfilCompleto) {}
