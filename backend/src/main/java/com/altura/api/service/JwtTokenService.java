package com.altura.api.service;

import com.altura.api.repository.AuthRepository.AuthUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
public class JwtTokenService {
    private final JwtEncoder encoder;
    private final String issuer;
    private final Duration accessTokenDuration;

    public JwtTokenService(
            JwtEncoder encoder,
            @Value("${app.security.jwt.issuer}") String issuer,
            @Value("${app.security.jwt.access-token-minutes}") long accessTokenMinutes
    ) {
        this.encoder = encoder;
        this.issuer = issuer;
        this.accessTokenDuration = Duration.ofMinutes(accessTokenMinutes);
    }

    public IssuedToken issue(AuthUser user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(accessTokenDuration);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(user.id().toString())
                .claim("email", user.email())
                .claim("tipo", user.type())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        String value = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(value, accessTokenDuration.toSeconds());
    }

    public record IssuedToken(String value, long expiresIn) {}
}
