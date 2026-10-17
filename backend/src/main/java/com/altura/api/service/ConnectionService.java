package com.altura.api.service;

import com.altura.api.dto.ConnectionResponse;
import com.altura.api.dto.CreateHelloConnectionRequest;
import com.altura.api.dto.CreateConnectionRequest;
import com.altura.api.dto.MessageResponse;
import com.altura.api.dto.SendMessageRequest;
import com.altura.api.dto.UpdateConnectionStatusRequest;
import com.altura.api.exception.ApiException;
import com.altura.api.repository.AuthRepository;
import com.altura.api.repository.AuthRepository.AuthUser;
import com.altura.api.repository.ConnectionRepository;
import com.altura.api.repository.ProfileRepository;
import com.altura.api.realtime.RealtimeEvent;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ConnectionService {
    private final ConnectionRepository repository;
    private final AuthRepository authRepository;
    private final ProfileRepository profileRepository;
    private final NotificationService notificationService;
    private final RealtimeService realtimeService;

    public ConnectionService(ConnectionRepository repository, AuthRepository authRepository,
                             ProfileRepository profileRepository,
                             NotificationService notificationService,
                             RealtimeService realtimeService) {
        this.repository = repository;
        this.authRepository = authRepository;
        this.profileRepository = profileRepository;
        this.notificationService = notificationService;
        this.realtimeService = realtimeService;
    }

    @Transactional(readOnly = true)
    public List<ConnectionResponse> list(UUID userId) {
        requireMember(userId);
        return repository.list(userId);
    }

    @Transactional
    public ConnectionResponse create(UUID userId, CreateConnectionRequest request) {
        AuthUser user = requireMember(userId);
        if (!"investidor".equals(user.type())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Somente investidores podem demonstrar interesse em uma rodada.");
        }
        if (!repository.openRoundExists(request.captacaoId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Rodada aberta não encontrada.");
        }
        if (repository.existsForRoundAndInvestor(request.captacaoId(), userId)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Você já demonstrou interesse nesta rodada.");
        }
        ConnectionResponse connection = repository.create(userId, request);
        notificationService.notify(connection.contraparte().usuarioId(), userId, "conexao", connection.id(),
                "Pedido de conexão", "demonstrou interesse na sua rodada.", "/conversas");
        realtimeService.sendAfterCommit(connection.contraparte().usuarioId(),
                RealtimeEvent.connectionChanged(connection.id()));
        return connection;
    }

    @Transactional
    public ConnectionResponse createHello(UUID userId, CreateHelloConnectionRequest request) {
        AuthUser user = requireMember(userId);
        if (!"startup".equals(user.type())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Somente startups podem iniciar uma conexão com investidores.");
        }
        if (!repository.openRoundExistsForStartup(userId)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Abra uma rodada de captação antes de iniciar uma conexão.");
        }
        if (repository.existsForStartupAndInvestor(userId, request.investorUserId())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Você já enviou uma solicitação para este investidor.");
        }
        ConnectionResponse connection = repository.createHello(userId, request);
        notificationService.notify(connection.contraparte().usuarioId(), userId, "conexao", connection.id(),
                "Pedido de conexão", "demonstrou interesse em conversar.", "/conversas");
        realtimeService.sendAfterCommit(connection.contraparte().usuarioId(),
                RealtimeEvent.connectionChanged(connection.id()));
        return connection;
    }

    @Transactional
    public ConnectionResponse updateStatus(UUID userId, long connectionId,
                                           UpdateConnectionStatusRequest request) {
        requireMember(userId);
        ConnectionResponse connection = requireConnection(userId, connectionId);
        if (!"pendente".equals(connection.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "Esta conexão já foi respondida.");
        }
        if (!repository.updateStatus(connectionId, userId, request.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "Não foi possível atualizar a conexão.");
        }
        ConnectionResponse updated = requireConnection(userId, connectionId);
        String accepted = "aceito".equals(updated.status()) ? "aceitou" : "recusou";
        if ("recusado".equals(updated.status())) {
            UUID counterpartId = updated.contraparte().usuarioId();
            repository.delete(connectionId, userId);
            realtimeService.sendAfterCommit(counterpartId,
                    RealtimeEvent.connectionDeleted(connectionId));
        }
        notificationService.notify(updated.contraparte().usuarioId(), userId, "status_conexao", connectionId,
                "Conexão atualizada", accepted + " sua solicitação de conexão.", "/conversas");
        if (!"recusado".equals(updated.status())) {
            realtimeService.sendAfterCommit(updated.contraparte().usuarioId(),
                    RealtimeEvent.connectionChanged(connectionId));
        }
        return updated;
    }

    @Transactional
    public List<MessageResponse> messages(UUID userId, long connectionId) {
        requireMember(userId);
        requireAcceptedConnection(userId, connectionId);
        return repository.messages(connectionId, userId);
    }

    @Transactional
    public MessageResponse sendMessage(UUID userId, long connectionId, SendMessageRequest request) {
        requireMember(userId);
        ConnectionResponse connection = requireAcceptedConnection(userId, connectionId);
        MessageResponse message = repository.addMessage(connectionId, userId, request.conteudo());
        notificationService.notify(connection.contraparte().usuarioId(), userId, "mensagem", message.id(),
                "Nova mensagem", "enviou uma nova mensagem.", "/conversas");
        realtimeService.sendAfterCommit(connection.contraparte().usuarioId(),
                RealtimeEvent.messageCreated(connectionId, message));
        return message;
    }

    @Transactional
    public void delete(UUID userId, long connectionId) {
        requireMember(userId);
        ConnectionResponse connection = requireConnection(userId, connectionId);
        if (repository.hasAcceptedProposal(connectionId)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Uma conexão com investimento confirmado não pode ser excluída.");
        }
        if (!repository.delete(connectionId, userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Conexão não encontrada.");
        }
        realtimeService.sendAfterCommit(connection.contraparte().usuarioId(),
                RealtimeEvent.connectionDeleted(connectionId));
    }

    private ConnectionResponse requireAcceptedConnection(UUID userId, long connectionId) {
        ConnectionResponse connection = requireConnection(userId, connectionId);
        if (!"aceito".equals(connection.status())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "A conversa será liberada quando a conexão for aceita.");
        }
        return connection;
    }

    private ConnectionResponse requireConnection(UUID userId, long connectionId) {
        return repository.findById(userId, connectionId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Conexão não encontrada."));
    }

    private AuthUser requireMember(UUID userId) {
        AuthUser user = authRepository.findById(userId).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "Usuário da sessão não encontrado."));
        if (!user.active()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Este usuário está inativo.");
        }
        if (!profileRepository.profileExists(userId, user.type())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Conclua seu perfil antes de acessar as conexões.");
        }
        return user;
    }
}
