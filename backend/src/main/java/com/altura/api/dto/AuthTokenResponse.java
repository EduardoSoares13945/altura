package com.altura.api.dto;

public record AuthTokenResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        AuthUserResponse user
) {}
