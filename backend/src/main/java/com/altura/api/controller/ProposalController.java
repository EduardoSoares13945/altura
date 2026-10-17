package com.altura.api.controller;

import com.altura.api.dto.CreateProposalRequest;
import com.altura.api.dto.ProposalResponse;
import com.altura.api.dto.UpdateProposalStatusRequest;
import com.altura.api.exception.ApiException;
import com.altura.api.service.ProposalService;
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
public class ProposalController {
    private final ProposalService service;
    public ProposalController(ProposalService service) { this.service = service; }

    @GetMapping("/connections/{connectionId}/proposals")
    List<ProposalResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable long connectionId) {
        return service.list(subject(jwt), connectionId);
    }

    @PostMapping("/connections/{connectionId}/proposals")
    ResponseEntity<ProposalResponse> create(@AuthenticationPrincipal Jwt jwt, @PathVariable long connectionId,
                                            @Valid @RequestBody CreateProposalRequest request) {
        ProposalResponse created = service.create(subject(jwt), connectionId, request);
        return ResponseEntity.created(URI.create("/api/proposals/" + created.id())).body(created);
    }

    @PatchMapping("/proposals/{proposalId}/status")
    ProposalResponse respond(@AuthenticationPrincipal Jwt jwt, @PathVariable long proposalId,
                             @Valid @RequestBody UpdateProposalStatusRequest request) {
        return service.respond(subject(jwt), proposalId, request);
    }

    @DeleteMapping("/proposals/{proposalId}")
    ResponseEntity<Void> cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable long proposalId) {
        service.cancel(subject(jwt), proposalId);
        return ResponseEntity.noContent().build();
    }

    private UUID subject(Jwt jwt) {
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException exception) { throw new ApiException(HttpStatus.UNAUTHORIZED, "Token inválido."); }
    }
}
