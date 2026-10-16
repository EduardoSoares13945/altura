package com.altura.api.controller;

import com.altura.api.dto.InvestorProfileRequest;
import com.altura.api.dto.InvestorProfileResponse;
import com.altura.api.dto.InvestorDetailsResponse;
import com.altura.api.dto.MeResponse;
import com.altura.api.dto.OpenRoundResponse;
import com.altura.api.dto.SegmentResponse;
import com.altura.api.dto.StartupProfileRequest;
import com.altura.api.dto.StartupProfileResponse;
import com.altura.api.dto.StartupDetailsResponse;
import com.altura.api.exception.ApiException;
import com.altura.api.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ProfileController {
    private final ProfileService service;

    public ProfileController(ProfileService service) {
        this.service = service;
    }

    @GetMapping("/me")
    MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return service.me(subject(jwt));
    }

    @GetMapping("/segments")
    List<SegmentResponse> segments() {
        return service.segments();
    }

    @GetMapping("/me/startup-profile")
    StartupProfileResponse startup(@AuthenticationPrincipal Jwt jwt) {
        return service.startup(subject(jwt));
    }

    @GetMapping("/startups/{userId}/details")
    StartupDetailsResponse startupDetails(@AuthenticationPrincipal Jwt jwt,
                                          @PathVariable UUID userId) {
        return service.startupDetails(subject(jwt), userId);
    }

    @PutMapping("/me/startup-profile")
    StartupProfileResponse saveStartup(@AuthenticationPrincipal Jwt jwt,
                                       @Valid @RequestBody StartupProfileRequest request) {
        return service.saveStartup(subject(jwt), request);
    }

    @DeleteMapping("/me/startup-profile")
    ResponseEntity<Void> deleteStartup(@AuthenticationPrincipal Jwt jwt) {
        service.deleteStartup(subject(jwt));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/investor-profile")
    InvestorProfileResponse investor(@AuthenticationPrincipal Jwt jwt) {
        return service.investor(subject(jwt));
    }

    @GetMapping("/investors/{userId}/details")
    InvestorDetailsResponse investorDetails(@AuthenticationPrincipal Jwt jwt,
                                            @PathVariable UUID userId) {
        return service.investorDetails(subject(jwt), userId);
    }

    @PutMapping("/me/investor-profile")
    InvestorProfileResponse saveInvestor(@AuthenticationPrincipal Jwt jwt,
                                         @Valid @RequestBody InvestorProfileRequest request) {
        return service.saveInvestor(subject(jwt), request);
    }

    @DeleteMapping("/me/investor-profile")
    ResponseEntity<Void> deleteInvestor(@AuthenticationPrincipal Jwt jwt) {
        service.deleteInvestor(subject(jwt));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/rounds/open")
    List<OpenRoundResponse> openRounds(@AuthenticationPrincipal Jwt jwt) {
        return service.openRounds(subject(jwt));
    }

    private UUID subject(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token de acesso inválido.");
        }
    }
}
