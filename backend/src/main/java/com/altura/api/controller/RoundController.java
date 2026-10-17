package com.altura.api.controller;

import com.altura.api.dto.CreateRoundRequest;
import com.altura.api.dto.DashboardSummaryResponse;
import com.altura.api.dto.ManagedRoundResponse;
import com.altura.api.dto.UpdateRoundStatusRequest;
import com.altura.api.exception.ApiException;
import com.altura.api.service.RoundService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class RoundController {
    private final RoundService service;
    public RoundController(RoundService service) { this.service = service; }

    @GetMapping("/rounds/mine")
    List<ManagedRoundResponse> mine(@AuthenticationPrincipal Jwt jwt) { return service.list(subject(jwt)); }

    @PostMapping("/rounds")
    ResponseEntity<ManagedRoundResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                @Valid @RequestBody CreateRoundRequest request) {
        var created = service.create(subject(jwt), request);
        return ResponseEntity.created(URI.create("/api/rounds/" + created.id())).body(created);
    }

    @PutMapping("/rounds/{roundId}")
    ManagedRoundResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable long roundId,
                                @Valid @RequestBody CreateRoundRequest request) {
        return service.update(subject(jwt), roundId, request);
    }

    @PatchMapping("/rounds/{roundId}/status")
    ManagedRoundResponse status(@AuthenticationPrincipal Jwt jwt, @PathVariable long roundId,
                                @Valid @RequestBody UpdateRoundStatusRequest request) {
        return service.updateStatus(subject(jwt), roundId, request);
    }

    @GetMapping("/dashboard/summary")
    DashboardSummaryResponse dashboard(@AuthenticationPrincipal Jwt jwt) { return service.dashboard(subject(jwt)); }

    private UUID subject(Jwt jwt) {
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException exception) { throw new ApiException(HttpStatus.UNAUTHORIZED, "Token inválido."); }
    }
}
