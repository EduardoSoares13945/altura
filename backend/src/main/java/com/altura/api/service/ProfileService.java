package com.altura.api.service;

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
import com.altura.api.repository.AuthRepository;
import com.altura.api.repository.AuthRepository.AuthUser;
import com.altura.api.repository.ProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class ProfileService {
    private static final Pattern PROFILE_IMAGE = Pattern.compile(
            "^data:image/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$");
    private final ProfileRepository repository;
    private final AuthRepository authRepository;
    private final MatchCalculator matchCalculator;

    public ProfileService(ProfileRepository repository, AuthRepository authRepository,
                          MatchCalculator matchCalculator) {
        this.repository = repository;
        this.authRepository = authRepository;
        this.matchCalculator = matchCalculator;
    }

    @Transactional(readOnly = true)
    public MeResponse me(UUID userId) {
        AuthUser user = requireUser(userId);
        return new MeResponse(user.id(), user.name(), user.type(), user.active(),
                repository.profileExists(userId, user.type()));
    }

    @Transactional(readOnly = true)
    public List<SegmentResponse> segments() {
        return repository.listSegments();
    }

    @Transactional
    public StartupProfileResponse saveStartup(UUID userId, StartupProfileRequest request) {
        requireType(userId, "startup");
        validateStartup(request);
        validateProfileImage(request.imagemPerfil());
        authRepository.updateName(userId, request.nomeResponsavel());
        return repository.saveStartup(userId, request);
    }

    @Transactional(readOnly = true)
    public StartupProfileResponse startup(UUID userId) {
        requireType(userId, "startup");
        return repository.findStartup(userId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Perfil de startup ainda não cadastrado."));
    }

    @Transactional(readOnly = true)
    public StartupDetailsResponse startupDetails(UUID viewerId, UUID startupUserId) {
        requireUser(viewerId);
        return repository.findStartupDetails(startupUserId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Perfil da startup não encontrado."));
    }

    @Transactional
    public void deleteStartup(UUID userId) {
        requireType(userId, "startup");
        repository.deleteStartup(userId);
    }

    @Transactional
    public InvestorProfileResponse saveInvestor(UUID userId, InvestorProfileRequest request) {
        requireType(userId, "investidor");
        validateProfileImage(request.imagemPerfil());
        if (request.ticketMin() == null || request.ticketMax() == null
                || request.ticketMin().signum() < 0 || request.ticketMax().signum() <= 0
                || request.ticketMin().compareTo(request.ticketMax()) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Informe uma faixa de investimento válida.");
        }
        authRepository.updateName(userId, request.nome());
        return repository.saveInvestor(userId, request);
    }

    @Transactional(readOnly = true)
    public InvestorProfileResponse investor(UUID userId) {
        requireType(userId, "investidor");
        return repository.findInvestor(userId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Perfil de investidor ainda não cadastrado."));
    }

    @Transactional(readOnly = true)
    public InvestorDetailsResponse investorDetails(UUID viewerId, UUID investorUserId) {
        requireType(viewerId, "startup");
        return repository.findInvestorDetails(investorUserId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Perfil do investidor não encontrado."));
    }

    @Transactional
    public void deleteInvestor(UUID userId) {
        requireType(userId, "investidor");
        repository.deleteInvestor(userId);
    }

    @Transactional(readOnly = true)
    public List<OpenRoundResponse> openRounds(UUID userId) {
        requireType(userId, "investidor");
        InvestorProfileResponse investor = repository.findInvestor(userId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Perfil de investidor ainda não cadastrado."));
        List<SegmentResponse> catalog = repository.listSegments();
        return repository.listOpenRounds().stream().map(round -> new OpenRoundResponse(
                round.id(), round.startupId(), round.valorAlvo(), round.valorCaptado(),
                round.percentualEquityOferecido(), round.status(), round.dataInicio(),
                matchCalculator.calculate(round, investor, catalog), round.startup())).toList();
    }

    private void validateStartup(StartupProfileRequest request) {
        if (request.dataFundacao().isAfter(LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A data de fundação não pode estar no futuro.");
        }

        YearMonth reference;
        try {
            reference = YearMonth.parse(request.tracao().mesReferencia());
        } catch (DateTimeParseException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "O mês de referência é inválido.");
        }
        YearMonth current = YearMonth.now();
        if (reference.isAfter(current) || reference.isBefore(current.minusMonths(12))) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "O mês de referência deve estar entre o mês atual e os últimos 12 meses.");
        }
        if (!request.tracao().hasRealSignal()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Informe ao menos um sinal real de tração: receita, MRR, clientes ou pilotos ativos.");
        }
    }

    private void validateProfileImage(String image) {
        if (image == null || image.isBlank()) return;
        if (image.length() > 500000 || !PROFILE_IMAGE.matcher(image).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "A imagem de perfil deve ser JPG, PNG ou WebP e ter até 500 KB após o processamento.");
        }
    }

    private AuthUser requireUser(UUID userId) {
        AuthUser user = authRepository.findById(userId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND,
                        "Cadastro base não encontrado. Saia e crie a conta novamente."));
        if (!user.active()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Este usuário está inativo.");
        }
        return user;
    }

    private void requireType(UUID userId, String expected) {
        AuthUser user = requireUser(userId);
        if (!expected.equals(user.type())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Este recurso não está disponível para seu tipo de perfil.");
        }
    }
}
