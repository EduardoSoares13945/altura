package com.altura.api.repository;

import com.altura.api.dto.ConnectionResponse;
import com.altura.api.dto.CreateHelloConnectionRequest;
import com.altura.api.dto.CreateConnectionRequest;
import com.altura.api.dto.MessageResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcConnectionRepository implements ConnectionRepository {
    private static final String CONNECTION_SELECT = """
            select m.id, m.status::text as status, m.solicitante_usuario_id,
                   m.valor_proposto, m.mensagem_inicial,
                   m.created_at, m.updated_at, c.id as captacao_id,
                   s.id as startup_id, s.nome as startup_nome,
                   su.id as startup_usuario_id, iu.id as investidor_usuario_id,
                   su.nome as startup_responsavel,
                   i.nome as investidor_nome, i.tipo as investidor_tipo,
                   s.imagem_perfil as startup_imagem,
                   i.imagem_perfil as investidor_imagem,
                   (select count(*) from public.mensagem msg
                    where msg.match_id = m.id and msg.remetente_usuario_id <> ?
                      and msg.lida_em is null) as nao_lidas
            from public.match m
            join public.captacao c on c.id = m.captacao_id
            join public.startup s on s.id = c.startup_id
            join public.usuario su on su.id = s.usuario_id
            join public.investidor i on i.id = m.investidor_id
            join public.usuario iu on iu.id = i.usuario_id
            """;

    private final JdbcTemplate jdbc;

    public JdbcConnectionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<ConnectionResponse> list(UUID userId) {
        return jdbc.query(CONNECTION_SELECT + """
                where su.id = ? or iu.id = ?
                order by m.updated_at desc, m.id desc
                """, (result, row) -> mapConnection(result, userId), userId, userId, userId);
    }

    @Override
    public Optional<ConnectionResponse> findById(UUID userId, long connectionId) {
        List<ConnectionResponse> rows = jdbc.query(CONNECTION_SELECT + """
                where m.id = ? and (su.id = ? or iu.id = ?)
                """, (result, row) -> mapConnection(result, userId), userId, connectionId, userId, userId);
        return rows.stream().findFirst();
    }

    @Override
    public boolean openRoundExists(long captacaoId) {
        Integer count = jdbc.queryForObject(
                "select count(*) from public.captacao where id = ? and status = 'aberta'",
                Integer.class, captacaoId);
        return count != null && count > 0;
    }

    @Override
    public boolean existsForRoundAndInvestor(long captacaoId, UUID investorUserId) {
        Integer count = jdbc.queryForObject("""
                select count(*)
                from public.match m
                join public.investidor i on i.id = m.investidor_id
                where m.captacao_id = ? and i.usuario_id = ?
                """, Integer.class, captacaoId, investorUserId);
        return count != null && count > 0;
    }

    @Override
    public boolean existsForStartupAndInvestor(UUID startupUserId, UUID investorUserId) {
        Integer count = jdbc.queryForObject("""
                select count(*)
                from public.match m
                join public.captacao c on c.id = m.captacao_id
                join public.startup s on s.id = c.startup_id
                join public.investidor i on i.id = m.investidor_id
                where s.usuario_id = ? and i.usuario_id = ?
                """, Integer.class, startupUserId, investorUserId);
        return count != null && count > 0;
    }

    @Override
    public boolean openRoundExistsForStartup(UUID startupUserId) {
        Integer count = jdbc.queryForObject("""
                select count(*)
                from public.captacao c
                join public.startup s on s.id = c.startup_id
                where s.usuario_id = ? and c.status = 'aberta'
                """, Integer.class, startupUserId);
        return count != null && count > 0;
    }

    @Override
    public ConnectionResponse create(UUID investorUserId, CreateConnectionRequest request) {
        Long id = jdbc.queryForObject("""
                insert into public.match (captacao_id, investidor_id, solicitante_usuario_id, valor_proposto, mensagem_inicial)
                select c.id, i.id, ?, ?, ?
                from public.captacao c
                cross join public.investidor i
                where c.id = ? and c.status = 'aberta' and i.usuario_id = ?
                returning id
                """, Long.class, investorUserId, request.valorProposto(), request.mensagem().trim(),
                request.captacaoId(), investorUserId);
        if (id == null) throw new IllegalStateException("Não foi possível criar a conexão.");
        if (request.valorProposto() != null) {
            jdbc.update("""
                    insert into public.proposta (match_id, autor_usuario_id, valor, mensagem)
                    values (?, ?, ?, ?)
                    """, id, investorUserId, request.valorProposto(), request.mensagem().trim());
        }
        return findById(investorUserId, id).orElseThrow();
    }

    @Override
    public ConnectionResponse createHello(UUID startupUserId, CreateHelloConnectionRequest request) {
        Long id = jdbc.queryForObject("""
                insert into public.match (captacao_id, investidor_id, solicitante_usuario_id, valor_proposto, mensagem_inicial)
                select c.id, i.id, ?, null, ?
                from public.captacao c
                join public.startup s on s.id = c.startup_id
                cross join public.investidor i
                where s.usuario_id = ? and c.status = 'aberta' and i.usuario_id = ?
                order by c.id desc
                limit 1
                returning id
                """, Long.class, startupUserId, request.mensagem().trim(), startupUserId, request.investorUserId());
        if (id == null) throw new IllegalStateException("Não foi possível criar a conexão.");
        return findById(startupUserId, id).orElseThrow();
    }

    @Override
    public boolean updateStatus(long connectionId, UUID startupUserId, String status) {
        return jdbc.update("""
                update public.match m
                set status = ?::public.status_match
                from public.captacao c, public.startup s, public.investidor i
                where m.id = ? and m.status = 'pendente'
                  and c.id = m.captacao_id and s.id = c.startup_id and i.id = m.investidor_id
                  and ((s.usuario_id = ? and m.solicitante_usuario_id = i.usuario_id)
                    or (i.usuario_id = ? and m.solicitante_usuario_id = s.usuario_id))
                """, status, connectionId, startupUserId, startupUserId) > 0;
    }

    @Override
    public List<MessageResponse> messages(long connectionId, UUID viewerId) {
        jdbc.update("""
                update public.mensagem
                set lida_em = now()
                where match_id = ? and remetente_usuario_id <> ? and lida_em is null
                """, connectionId, viewerId);
        return jdbc.query("""
                select msg.id, msg.remetente_usuario_id,
                       coalesce(s.nome, i.nome, u.nome) as remetente_nome,
                       msg.conteudo, msg.created_at, msg.lida_em
                from public.mensagem msg
                join public.usuario u on u.id = msg.remetente_usuario_id
                left join public.startup s on s.usuario_id = u.id
                left join public.investidor i on i.usuario_id = u.id
                where msg.match_id = ?
                order by msg.created_at, msg.id
                """, (result, row) -> mapMessage(result), connectionId);
    }

    @Override
    public MessageResponse addMessage(long connectionId, UUID senderId, String content) {
        Long id = jdbc.queryForObject("""
                insert into public.mensagem (match_id, remetente_usuario_id, conteudo)
                values (?, ?, ?) returning id
                """, Long.class, connectionId, senderId, content.trim());
        return jdbc.queryForObject("""
                select msg.id, msg.remetente_usuario_id,
                       coalesce(s.nome, i.nome, u.nome) as remetente_nome,
                       msg.conteudo, msg.created_at, msg.lida_em
                from public.mensagem msg
                join public.usuario u on u.id = msg.remetente_usuario_id
                left join public.startup s on s.usuario_id = u.id
                left join public.investidor i on i.usuario_id = u.id
                where msg.id = ?
                """, (result, row) -> mapMessage(result), id);
    }

    @Override
    public boolean hasAcceptedProposal(long connectionId) {
        Integer count = jdbc.queryForObject(
                "select count(*) from public.proposta where match_id = ? and status = 'aceita'",
                Integer.class, connectionId);
        return count != null && count > 0;
    }

    @Override
    public boolean delete(long connectionId, UUID userId) {
        jdbc.update("""
                delete from public.notificacao n
                where exists (
                    select 1
                    from public.match m
                    join public.captacao c on c.id = m.captacao_id
                    join public.startup s on s.id = c.startup_id
                    join public.investidor i on i.id = m.investidor_id
                    where m.id = ? and (s.usuario_id = ? or i.usuario_id = ?)
                ) and (
                    (n.tipo in ('conexao', 'status_conexao') and n.referencia_id = ?)
                    or (n.tipo = 'mensagem' and n.referencia_id in (
                        select msg.id from public.mensagem msg where msg.match_id = ?
                    ))
                )
                """, connectionId, userId, userId, connectionId, connectionId);
        return jdbc.update("""
                delete from public.match m
                using public.captacao c, public.startup s, public.investidor i
                where m.id = ? and c.id = m.captacao_id and s.id = c.startup_id
                  and i.id = m.investidor_id and (s.usuario_id = ? or i.usuario_id = ?)
                """, connectionId, userId, userId) > 0;
    }

    private ConnectionResponse mapConnection(ResultSet result, UUID viewerId) throws SQLException {
        UUID startupUserId = result.getObject("startup_usuario_id", UUID.class);
        UUID investorUserId = result.getObject("investidor_usuario_id", UUID.class);
        boolean viewerIsStartup = viewerId.equals(startupUserId);
        return new ConnectionResponse(
                result.getLong("id"), result.getString("status"),
                result.getObject("solicitante_usuario_id", UUID.class),
                result.getBigDecimal("valor_proposto"), result.getString("mensagem_inicial"),
                result.getTimestamp("created_at").toInstant(),
                result.getTimestamp("updated_at").toInstant(), result.getInt("nao_lidas"),
                new ConnectionResponse.PersonData(
                        viewerIsStartup ? investorUserId : startupUserId,
                        viewerIsStartup ? result.getString("investidor_nome") : result.getString("startup_nome"),
                        viewerIsStartup ? "investidor" : "startup",
                        viewerIsStartup ? result.getString("investidor_tipo") : null,
                        viewerIsStartup ? null : result.getString("startup_responsavel"),
                        viewerIsStartup ? result.getString("investidor_imagem") : result.getString("startup_imagem")),
                new ConnectionResponse.RoundData(result.getLong("captacao_id"),
                        result.getLong("startup_id"), result.getString("startup_nome")));
    }

    private MessageResponse mapMessage(ResultSet result) throws SQLException {
        return new MessageResponse(
                result.getLong("id"), result.getObject("remetente_usuario_id", UUID.class),
                result.getString("remetente_nome"), result.getString("conteudo"),
                result.getTimestamp("created_at").toInstant(), result.getTimestamp("lida_em") != null);
    }
}
