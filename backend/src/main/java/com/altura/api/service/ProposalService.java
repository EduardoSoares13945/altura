package com.altura.api.service;

import com.altura.api.dto.CreateProposalRequest;
import com.altura.api.dto.ProposalResponse;
import com.altura.api.dto.UpdateProposalStatusRequest;
import com.altura.api.exception.ApiException;
import com.altura.api.repository.ConnectionRepository;
import com.altura.api.repository.ProposalRepository;
import com.altura.api.realtime.RealtimeEvent;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProposalService {
    private final ProposalRepository repository;
    private final ConnectionRepository connectionRepository;
    private final NotificationService notificationService;
    private final RealtimeService realtimeService;

    public ProposalService(ProposalRepository repository, ConnectionRepository connectionRepository,
                           NotificationService notificationService, RealtimeService realtimeService) {
        this.repository = repository;
        this.connectionRepository = connectionRepository;
        this.notificationService = notificationService;
        this.realtimeService = realtimeService;
    }

    @Transactional(readOnly = true)
    public List<ProposalResponse> list(UUID userId, long connectionId) {
        requireConnection(userId, connectionId);
        return repository.list(connectionId);
    }

    @Transactional
    public ProposalResponse create(UUID userId, long connectionId, CreateProposalRequest request) {
        var connection = requireAccepted(userId, connectionId);
        List<ProposalResponse> proposals = repository.list(connectionId);
        ProposalResponse pending = proposals.stream().filter(p -> "pendente".equals(p.status())).findFirst().orElse(null);
        if (pending != null && pending.autorUsuarioId().equals(userId)) {
            throw new ApiException(HttpStatus.CONFLICT, "Aguarde a resposta da contraparte antes de enviar outra proposta.");
        }
        ProposalResponse created = repository.create(connectionId, userId, request.valor(), request.mensagem());
        notificationService.notify(connection.contraparte().usuarioId(), userId, "proposta", created.id(),
                pending == null ? "Nova proposta" : "Nova contraproposta",
                "enviou uma proposta de investimento.", "/conversas");
        realtimeService.sendAfterCommit(connection.contraparte().usuarioId(),
                RealtimeEvent.proposalChanged(connectionId, created));
        return created;
    }

    @Transactional
    public ProposalResponse respond(UUID userId, long proposalId, UpdateProposalStatusRequest request) {
        ProposalResponse proposal = repository.find(proposalId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Proposta não encontrada."));
        var connection = requireAccepted(userId, proposal.connectionId());
        if (proposal.autorUsuarioId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "O autor não pode aceitar ou recusar a própria proposta.");
        }
        boolean changed = "aceita".equals(request.status())
                ? repository.accept(proposalId) : repository.reject(proposalId);
        if (!changed) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "A proposta já foi respondida ou ultrapassa o valor restante da rodada.");
        }
        ProposalResponse updated = repository.find(proposalId).orElseThrow();
        notificationService.notify(proposal.autorUsuarioId(), userId, "proposta", proposalId,
                "Proposta " + ("aceita".equals(updated.status()) ? "aceita" : "recusada"),
                "respondeu sua proposta de investimento.", "/conversas");
        realtimeService.sendAfterCommit(proposal.autorUsuarioId(),
                RealtimeEvent.proposalChanged(proposal.connectionId(), updated));
        if ("aceita".equals(updated.status())) realtimeService.broadcastAfterCommit(RealtimeEvent.roundChanged(connection.rodada().captacaoId()));
        return updated;
    }

    @Transactional
    public void cancel(UUID userId, long proposalId) {
        ProposalResponse proposal = repository.find(proposalId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Proposta não encontrada."));
        var connection = requireConnection(userId, proposal.connectionId());
        if (!repository.cancel(proposalId, userId)) {
            throw new ApiException(HttpStatus.CONFLICT, "Somente uma proposta pendente do próprio usuário pode ser cancelada.");
        }
        realtimeService.sendAfterCommit(connection.contraparte().usuarioId(),
                RealtimeEvent.proposalChanged(proposal.connectionId(), null));
    }

    private com.altura.api.dto.ConnectionResponse requireAccepted(UUID userId, long connectionId) {
        var connection = requireConnection(userId, connectionId);
        if (!"aceito".equals(connection.status())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Aceite a conexão antes de negociar propostas.");
        }
        return connection;
    }

    private com.altura.api.dto.ConnectionResponse requireConnection(UUID userId, long connectionId) {
        return connectionRepository.findById(userId, connectionId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Conexão não encontrada."));
    }
}
