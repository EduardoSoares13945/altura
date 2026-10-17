package com.altura.api.service;

import com.altura.api.dto.CreateRoundRequest;
import com.altura.api.dto.DashboardSummaryResponse;
import com.altura.api.dto.ManagedRoundResponse;
import com.altura.api.dto.UpdateRoundStatusRequest;
import com.altura.api.exception.ApiException;
import com.altura.api.repository.AuthRepository;
import com.altura.api.repository.ProfileRepository;
import com.altura.api.repository.RoundRepository;
import com.altura.api.realtime.RealtimeEvent;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class RoundService {
    private final RoundRepository repository;
    private final AuthRepository authRepository;
    private final ProfileRepository profileRepository;
    private final RealtimeService realtimeService;

    public RoundService(RoundRepository repository, AuthRepository authRepository,
                        ProfileRepository profileRepository, RealtimeService realtimeService) {
        this.repository = repository;
        this.authRepository = authRepository;
        this.profileRepository = profileRepository;
        this.realtimeService = realtimeService;
    }

    @Transactional(readOnly = true)
    public List<ManagedRoundResponse> list(UUID userId) { requireStartup(userId); return repository.listOwned(userId); }

    @Transactional
    public ManagedRoundResponse create(UUID userId, CreateRoundRequest request) {
        requireStartup(userId);
        if (!repository.listOwned(userId).isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Sua startup já possui uma rodada. Edite a rodada existente no perfil.");
        }
        ManagedRoundResponse created = repository.create(userId, request);
        realtimeService.broadcastAfterCommit(RealtimeEvent.roundChanged(created.id()));
        return created;
    }

    @Transactional
    public ManagedRoundResponse update(UUID userId, long roundId, CreateRoundRequest request) {
        requireStartup(userId);
        if (!repository.update(userId, roundId, request)) {
            throw new ApiException(HttpStatus.CONFLICT, "A rodada não existe, não está aberta ou a meta é menor que o valor captado.");
        }
        ManagedRoundResponse updated = repository.findOwned(userId, roundId).orElseThrow();
        realtimeService.broadcastAfterCommit(RealtimeEvent.roundChanged(roundId));
        return updated;
    }

    @Transactional
    public ManagedRoundResponse updateStatus(UUID userId, long roundId, UpdateRoundStatusRequest request) {
        requireStartup(userId);
        ManagedRoundResponse current = repository.findOwned(userId, roundId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Rodada não encontrada."));
        if ("cancelada".equals(request.status()) && repository.hasAcceptedProposal(roundId)) {
            throw new ApiException(HttpStatus.CONFLICT, "Uma rodada com investimento aceito não pode ser cancelada.");
        }
        if (!repository.updateStatus(userId, roundId, request.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "Não foi possível atualizar a rodada.");
        }
        realtimeService.broadcastAfterCommit(RealtimeEvent.roundChanged(roundId));
        return repository.findOwned(userId, roundId).orElse(current);
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse dashboard(UUID userId) {
        var user = requireUser(userId);
        if (!profileRepository.profileExists(userId, user.type())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Conclua seu perfil para acessar o painel.");
        }
        return repository.dashboard(userId, user.type());
    }

    private void requireStartup(UUID userId) {
        var user = requireUser(userId);
        if (!"startup".equals(user.type()) || !profileRepository.profileExists(userId, "startup")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Recurso exclusivo para startups com perfil completo.");
        }
    }

    private AuthRepository.AuthUser requireUser(UUID userId) {
        var user = authRepository.findById(userId).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "Usuário da sessão não encontrado."));
        if (!user.active()) throw new ApiException(HttpStatus.FORBIDDEN, "Este usuário está inativo.");
        return user;
    }
}
