package com.altura.api.repository;

import com.altura.api.dto.CreateRoundRequest;
import com.altura.api.dto.DashboardSummaryResponse;
import com.altura.api.dto.ManagedRoundResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcRoundRepository implements RoundRepository {
    private static final String SELECT = """
            select c.id, c.valor_alvo, c.valor_captado, c.percentual_equity_oferecido,
                   c.status::text as status, c.data_inicio, c.data_fim,
                   (select count(*) from public.match m where m.captacao_id = c.id) as propostas,
                   (select count(*) from public.match m join public.proposta p on p.match_id = m.id
                    where m.captacao_id = c.id and p.status = 'pendente') as propostas_pendentes
            from public.captacao c
            join public.startup s on s.id = c.startup_id
            """;

    private final JdbcTemplate jdbc;

    public JdbcRoundRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public List<ManagedRoundResponse> listOwned(UUID userId) {
        return jdbc.query(SELECT + " where s.usuario_id = ? order by c.created_at desc, c.id desc",
                (rs, row) -> map(rs), userId);
    }

    @Override
    public Optional<ManagedRoundResponse> findOwned(UUID userId, long roundId) {
        return jdbc.query(SELECT + " where s.usuario_id = ? and c.id = ?",
                (rs, row) -> map(rs), userId, roundId).stream().findFirst();
    }

    @Override
    public ManagedRoundResponse create(UUID userId, CreateRoundRequest request) {
        Long id = jdbc.queryForObject("""
                insert into public.captacao (startup_id, valor_alvo, percentual_equity_oferecido, data_fim)
                select s.id, ?, ?, ? from public.startup s where s.usuario_id = ?
                returning id
                """, Long.class, request.valorAlvo(), request.percentualEquityOferecido(),
                request.dataFim(), userId);
        return findOwned(userId, id).orElseThrow();
    }

    @Override
    public boolean update(UUID userId, long roundId, CreateRoundRequest request) {
        return jdbc.update("""
                update public.captacao c set valor_alvo = ?, percentual_equity_oferecido = ?,
                    data_fim = ?, updated_at = now()
                from public.startup s
                where c.id = ? and c.startup_id = s.id and s.usuario_id = ?
                  and c.status = 'aberta' and ? >= c.valor_captado
                """, request.valorAlvo(), request.percentualEquityOferecido(), request.dataFim(),
                roundId, userId, request.valorAlvo()) > 0;
    }

    @Override
    public boolean updateStatus(UUID userId, long roundId, String status) {
        return jdbc.update("""
                update public.captacao c set status = ?::public.status_rodada,
                    data_fim = case
                        when ? in ('encerrada', 'cancelada') then coalesce(data_fim, current_date)
                        when ? = 'aberta' and data_fim < current_date then null
                        else data_fim
                    end,
                    updated_at = now()
                from public.startup s
                where c.id = ? and c.startup_id = s.id and s.usuario_id = ?
                """, status, status, status, roundId, userId) > 0;
    }

    @Override
    public boolean hasAcceptedProposal(long roundId) {
        Integer count = jdbc.queryForObject("""
                select count(*) from public.proposta p
                join public.match m on m.id = p.match_id
                where m.captacao_id = ? and p.status = 'aceita'
                """, Integer.class, roundId);
        return count != null && count > 0;
    }

    @Override
    public DashboardSummaryResponse dashboard(UUID userId, String type) {
        if ("startup".equals(type)) {
            return jdbc.queryForObject("""
                    select count(*) filter (where c.status = 'aberta')::int as quantidade,
                           coalesce(sum(c.valor_captado), 0) as valor
                    from public.startup s left join public.captacao c on c.startup_id = s.id
                    where s.usuario_id = ?
                    """, (rs, row) -> new DashboardSummaryResponse(type, rs.getInt("quantidade"),
                    rs.getBigDecimal("valor")), userId);
        }
        return jdbc.queryForObject("""
                select count(distinct m.id) filter (where m.status = 'aceito')::int as quantidade,
                       coalesce(sum(p.valor) filter (where p.status = 'aceita'), 0) as valor
                from public.investidor i
                left join public.match m on m.investidor_id = i.id
                left join public.proposta p on p.match_id = m.id
                where i.usuario_id = ?
                """, (rs, row) -> new DashboardSummaryResponse(type, rs.getInt("quantidade"),
                rs.getBigDecimal("valor")), userId);
    }

    private ManagedRoundResponse map(ResultSet rs) throws SQLException {
        return new ManagedRoundResponse(rs.getLong("id"), rs.getBigDecimal("valor_alvo"),
                rs.getBigDecimal("valor_captado"), rs.getBigDecimal("percentual_equity_oferecido"),
                rs.getString("status"), rs.getObject("data_inicio", java.time.LocalDate.class),
                rs.getObject("data_fim", java.time.LocalDate.class), rs.getInt("propostas"),
                rs.getInt("propostas_pendentes"));
    }
}
