package com.altura.api.controller;

import com.altura.api.dto.ConnectionResponse;
import com.altura.api.dto.CreateHelloConnectionRequest;
import com.altura.api.dto.CreateConnectionRequest;
import com.altura.api.dto.MessageResponse;
import com.altura.api.dto.SendMessageRequest;
import com.altura.api.dto.UpdateConnectionStatusRequest;
import com.altura.api.exception.ApiException;
import com.altura.api.service.ConnectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/connections")
public class ConnectionController {
    private final ConnectionService service;

    public ConnectionController(ConnectionService service) {
        this.service = service;
    }

    @GetMapping
    List<ConnectionResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(subject(jwt));
    }

    @PostMapping
    ResponseEntity<ConnectionResponse> create(@AuthenticationPrincipal Jwt jwt,
                                              @Valid @RequestBody CreateConnectionRequest request) {
        ConnectionResponse connection = service.create(subject(jwt), request);
        return ResponseEntity.created(URI.create("/api/connections/" + connection.id()))
                .body(connection);
    }

    @PostMapping("/hello")
    ResponseEntity<ConnectionResponse> createHello(@AuthenticationPrincipal Jwt jwt,
                                                    @Valid @RequestBody CreateHelloConnectionRequest request) {
        ConnectionResponse connection = service.createHello(subject(jwt), request);
        return ResponseEntity.created(URI.create("/api/connections/" + connection.id()))
                .body(connection);
    }

    @PatchMapping("/{connectionId}/status")
    ConnectionResponse updateStatus(@AuthenticationPrincipal Jwt jwt,
                                    @PathVariable long connectionId,
                                    @Valid @RequestBody UpdateConnectionStatusRequest request) {
        return service.updateStatus(subject(jwt), connectionId, request);
    }

    @GetMapping("/{connectionId}/messages")
    List<MessageResponse> messages(@AuthenticationPrincipal Jwt jwt,
                                   @PathVariable long connectionId) {
        return service.messages(subject(jwt), connectionId);
    }

    @PostMapping("/{connectionId}/messages")
    ResponseEntity<MessageResponse> sendMessage(@AuthenticationPrincipal Jwt jwt,
                                                @PathVariable long connectionId,
                                                @Valid @RequestBody SendMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.sendMessage(subject(jwt), connectionId, request));
    }

    @DeleteMapping("/{connectionId}")
    ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt,
                                @PathVariable long connectionId) {
        service.delete(subject(jwt), connectionId);
        return ResponseEntity.noContent().build();
    }

    private UUID subject(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token de acesso inválido.");
        }
    }
}
