package com.altura.api.repository;

import com.altura.api.dto.InvestorProfileRequest;
import com.altura.api.dto.InvestorProfileResponse;
import com.altura.api.dto.InvestorDetailsResponse;
import com.altura.api.dto.OpenRoundResponse;
import com.altura.api.dto.SegmentResponse;
import com.altura.api.dto.StartupProfileRequest;
import com.altura.api.dto.StartupProfileResponse;
import com.altura.api.dto.StartupDetailsResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProfileRepository {
    boolean profileExists(UUID userId, String type);

    List<SegmentResponse> listSegments();

    StartupProfileResponse saveStartup(UUID userId, StartupProfileRequest request);

    Optional<StartupProfileResponse> findStartup(UUID userId);

    Optional<StartupDetailsResponse> findStartupDetails(UUID userId);

    void deleteStartup(UUID userId);

    InvestorProfileResponse saveInvestor(UUID userId, InvestorProfileRequest request);

    Optional<InvestorProfileResponse> findInvestor(UUID userId);

    Optional<InvestorDetailsResponse> findInvestorDetails(UUID userId);

    void deleteInvestor(UUID userId);

    List<OpenRoundResponse> listOpenRounds();
}
