package com.altura.api.repository;

import com.altura.api.dto.ProposalResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcProposalRepository implements ProposalRepository {
    private static final String SELECT = """
            select p.id, p.match_id, p.autor_usuario_id,
                   coalesce(s.nome, i.nome, u.nome) as autor_nome,
                   p.valor, p.mensagem, p.status, p.created_at, p.respondida_em
            from public.proposta p
            join public.usuario u on u.id = p.autor_usuario_id
            left join public.startup s on s.usuario_id = u.id
            left join public.investidor i on i.usuario_id = u.id
            """;

    private final JdbcTemplate jdbc;
    public JdbcProposalRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public List<ProposalResponse> list(long connectionId) {
        return jdbc.query(SELECT + " where p.match_id = ? order by p.created_at, p.id",
                (rs, row) -> map(rs), connectionId);
    }

    @Override
    public Optional<ProposalResponse> find(long proposalId) {
        return jdbc.query(SELECT + " where p.id = ?", (rs, row) -> map(rs), proposalId)
                .stream().findFirst();
    }

    @Override
    public ProposalResponse create(long connectionId, UUID authorId, BigDecimal value, String message) {
        jdbc.update("""
                update public.proposta set status = 'substituida', respondida_em = now()
                where match_id = ? and status = 'pendente'
                """, connectionId);
        Long id = jdbc.queryForObject("""
                insert into public.proposta (match_id, autor_usuario_id, valor, mensagem)
                values (?, ?, ?, nullif(btrim(?), '')) returning id
                """, Long.class, connectionId, authorId, value, message);
        jdbc.update("update public.match set valor_proposto = ?, updated_at = now() where id = ?",
                value, connectionId);
        return find(id).orElseThrow();
    }

    @Override
    public boolean accept(long proposalId) {
        Integer updated = jdbc.queryForObject("""
                with alvo as (
                    select p.id, p.match_id, p.valor, m.captacao_id
                    from public.proposta p join public.match m on m.id = p.match_id
                    join public.captacao c on c.id = m.captacao_id
                    where p.id = ? and p.status = 'pendente' and c.status = 'aberta'
                      and c.valor_captado + p.valor <= c.valor_alvo
                    for update of p, c
                ), proposta_atualizada as (
                    update public.proposta p set status = 'aceita', respondida_em = now()
                    from alvo a where p.id = a.id returning a.captacao_id, a.valor
                ), captacao_atualizada as (
                    update public.captacao c set valor_captado = c.valor_captado + pa.valor,
                        updated_at = now()
                    from proposta_atualizada pa where c.id = pa.captacao_id returning c.id
                ) select count(*)::int from captacao_atualizada
                """, Integer.class, proposalId);
        return updated != null && updated > 0;
    }

    @Override
    public boolean reject(long proposalId) {
        return jdbc.update("""
                update public.proposta set status = 'recusada', respondida_em = now()
                where id = ? and status = 'pendente'
                """, proposalId) > 0;
    }

    @Override
    public boolean cancel(long proposalId, UUID authorId) {
        return jdbc.update("""
                update public.proposta set status = 'cancelada', respondida_em = now()
                where id = ? and autor_usuario_id = ? and status = 'pendente'
                """, proposalId, authorId) > 0;
    }

    private ProposalResponse map(ResultSet rs) throws SQLException {
        var responded = rs.getTimestamp("respondida_em");
        return new ProposalResponse(rs.getLong("id"), rs.getLong("match_id"),
                rs.getObject("autor_usuario_id", UUID.class), rs.getString("autor_nome"),
                rs.getBigDecimal("valor"), rs.getString("mensagem"), rs.getString("status"),
                rs.getTimestamp("created_at").toInstant(), responded == null ? null : responded.toInstant());
    }
}
