package com.altura.api.repository;

import com.altura.api.dto.InvestorProfileRequest;
import com.altura.api.dto.InvestorProfileResponse;
import com.altura.api.dto.InvestorDetailsResponse;
import com.altura.api.dto.OpenRoundResponse;
import com.altura.api.dto.SegmentResponse;
import com.altura.api.dto.StartupProfileRequest;
import com.altura.api.dto.StartupProfileResponse;
import com.altura.api.dto.StartupDetailsResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcProfileRepository implements ProfileRepository {
    private final JdbcTemplate jdbc;

    public JdbcProfileRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean profileExists(UUID userId, String type) {
        String table = "startup".equals(type) ? "startup" : "investidor";
        Integer count = jdbc.queryForObject(
                "select count(*) from public." + table + " where usuario_id = ?", Integer.class, userId);
        return count != null && count > 0;
    }

    @Override
    public List<SegmentResponse> listSegments() {
        return jdbc.query("""
                select id, nome
                from public.segmento
                where ativo = true
                order by id
                """, (result, row) -> new SegmentResponse(result.getLong("id"), result.getString("nome")));
    }

    @Override
    public StartupProfileResponse saveStartup(UUID userId, StartupProfileRequest request) {
        Long startupId = jdbc.queryForObject("""
                insert into public.startup (
                    usuario_id, segmento_id, nome, cnpj, fase, descricao, video_pitch_url,
                    data_fundacao, site_url, linkedin_url, localizacao, cidade, estado,
                    latitude, longitude, imagem_perfil
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict (usuario_id) do update set
                    segmento_id = excluded.segmento_id,
                    nome = excluded.nome,
                    cnpj = excluded.cnpj,
                    fase = excluded.fase,
                    descricao = excluded.descricao,
                    video_pitch_url = excluded.video_pitch_url,
                    data_fundacao = excluded.data_fundacao,
                    site_url = excluded.site_url,
                    linkedin_url = excluded.linkedin_url,
                    localizacao = excluded.localizacao,
                    cidade = excluded.cidade,
                    estado = excluded.estado,
                    latitude = excluded.latitude,
                    longitude = excluded.longitude,
                    imagem_perfil = excluded.imagem_perfil
                returning id
                """, Long.class,
                userId, request.segmentoId(), request.nomeStartup().trim(), request.cnpj(), request.fase(),
                request.descricao().trim(), blankToNull(request.videoPitchUrl()), request.dataFundacao(),
                blankToNull(request.siteUrl()), blankToNull(request.linkedinUrl()),
                blankToNull(request.localizacao()), request.cidade().trim(), request.estado(),
                request.latitude(), request.longitude(), blankToNull(request.imagemPerfil()));

        replaceStartupSegments(startupId, request);
        saveTraction(startupId, request);
        saveRound(startupId, request);
        return findStartup(userId).orElseThrow();
    }

    @Override
    public Optional<StartupProfileResponse> findStartup(UUID userId) {
        Optional<StartupRow> startup = first(jdbc.query("""
                select s.id, u.nome as nome_responsavel, s.nome, s.cnpj, s.fase, s.segmento_id,
                       s.descricao, s.video_pitch_url, s.data_fundacao, s.site_url,
                       s.localizacao, s.cidade, s.estado, s.latitude, s.longitude, s.linkedin_url,
                       s.imagem_perfil
                from public.startup s
                join public.usuario u on u.id = s.usuario_id
                where s.usuario_id = ?
                """, (result, row) -> mapStartup(result), userId));
        return startup.map(this::toStartupResponse);
    }

    @Override
    public Optional<StartupDetailsResponse> findStartupDetails(UUID userId) {
        Optional<StartupDetailsRow> startup = first(jdbc.query("""
                select s.id, s.nome, s.fase, s.segmento_id, sg.nome as segmento_nome,
                       s.descricao, s.data_fundacao, s.site_url, s.cidade, s.estado,
                       s.video_pitch_url, s.linkedin_url, s.imagem_perfil
                from public.startup s
                join public.usuario u on u.id = s.usuario_id and u.ativo = true
                join public.segmento sg on sg.id = s.segmento_id
                where s.usuario_id = ?
                """, (result, row) -> new StartupDetailsRow(
                result.getLong("id"), result.getString("nome"), result.getString("fase"),
                result.getLong("segmento_id"), result.getString("segmento_nome"),
                result.getString("descricao"), result.getObject("data_fundacao", LocalDate.class),
                result.getString("site_url"), result.getString("cidade"), result.getString("estado"),
                result.getString("video_pitch_url"), result.getString("linkedin_url"),
                result.getString("imagem_perfil")), userId));
        return startup.map(row -> new StartupDetailsResponse(
                row.id(), row.nomeStartup(), row.fase(), row.segmentoId(), row.segmentoNome(),
                row.descricao(), row.dataFundacao(), row.siteUrl(), row.cidade(), row.estado(),
                row.videoPitchUrl(), row.linkedinUrl(), row.imagemPerfil(),
                startupSegmentNames(row.id()), latestTraction(row.id()).orElse(null),
                latestRound(row.id()).orElse(null)));
    }

    @Override
    public void deleteStartup(UUID userId) {
        jdbc.update("delete from public.startup where usuario_id = ?", userId);
    }

    @Override
    public InvestorProfileResponse saveInvestor(UUID userId, InvestorProfileRequest request) {
        Long investorId = jdbc.queryForObject("""
                insert into public.investidor (
                    usuario_id, nome, cpf, tipo, biografia, linkedin_url,
                    localizacao, cidade, estado, latitude, longitude, imagem_perfil,
                    ticket_min, ticket_max
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict (usuario_id) do update set
                    nome = excluded.nome,
                    cpf = excluded.cpf,
                    tipo = excluded.tipo,
                    biografia = excluded.biografia,
                    linkedin_url = excluded.linkedin_url,
                    localizacao = excluded.localizacao,
                    cidade = excluded.cidade,
                    estado = excluded.estado,
                    latitude = excluded.latitude,
                    longitude = excluded.longitude,
                    imagem_perfil = excluded.imagem_perfil,
                    ticket_min = excluded.ticket_min,
                    ticket_max = excluded.ticket_max
                returning id
                """, Long.class, userId, request.nome().trim(), request.cpf(), request.tipo().trim(),
                request.biografia().trim(), blankToNull(request.linkedinUrl()), blankToNull(request.localizacao()),
                request.cidade().trim(), request.estado(), request.latitude(), request.longitude(),
                blankToNull(request.imagemPerfil()), request.ticketMin(), request.ticketMax());

        jdbc.update("delete from public.investidor_segmento where investidor_id = ?", investorId);
        request.segmentos().stream().distinct().forEach(segmentId -> jdbc.update("""
                insert into public.investidor_segmento (investidor_id, segmento_id)
                values (?, ?)
                """, investorId, segmentId));
        return findInvestor(userId).orElseThrow();
    }

    @Override
    public Optional<InvestorProfileResponse> findInvestor(UUID userId) {
        Optional<InvestorRow> investor = first(jdbc.query("""
                select id, nome, cpf, tipo, biografia, linkedin_url,
                       localizacao, cidade, estado, latitude, longitude, imagem_perfil,
                       ticket_min, ticket_max
                from public.investidor
                where usuario_id = ?
                """, (result, row) -> new InvestorRow(
                result.getLong("id"), result.getString("nome"), result.getString("cpf"),
                result.getString("tipo"), result.getString("biografia"),
                result.getString("linkedin_url"), result.getString("localizacao"),
                result.getString("cidade"), result.getString("estado"),
                nullableDouble(result, "latitude"), nullableDouble(result, "longitude"),
                result.getString("imagem_perfil"), result.getBigDecimal("ticket_min"),
                result.getBigDecimal("ticket_max")), userId));
        return investor.map(row -> new InvestorProfileResponse(
                row.nome(), row.cpf(), row.tipo(), row.biografia(), investorSegments(row.id()),
                row.linkedinUrl(), row.localizacao(), row.cidade(),
                row.estado(), row.latitude(), row.longitude(), row.imagemPerfil(),
                row.ticketMin(), row.ticketMax()));
    }

    @Override
    public Optional<InvestorDetailsResponse> findInvestorDetails(UUID userId) {
        return first(jdbc.query("""
                select i.id, i.nome, i.tipo, i.biografia, i.linkedin_url,
                       i.cidade, i.estado, i.imagem_perfil
                from public.investidor i
                join public.usuario u on u.id = i.usuario_id and u.ativo = true
                where i.usuario_id = ?
                """, (result, row) -> new InvestorDetailsResponse(
                result.getString("nome"), result.getString("tipo"), result.getString("biografia"),
                investorSegmentNames(result.getLong("id")), result.getString("linkedin_url"),
                result.getString("cidade"), result.getString("estado"), result.getString("imagem_perfil")), userId));
    }

    @Override
    public void deleteInvestor(UUID userId) {
        jdbc.update("delete from public.investidor where usuario_id = ?", userId);
    }

    @Override
    public List<OpenRoundResponse> listOpenRounds() {
        List<OpenRoundRow> rounds = jdbc.query("""
                select c.id, c.startup_id, c.valor_alvo, c.valor_captado,
                       c.percentual_equity_oferecido, c.status::text as status, c.data_inicio,
                       s.usuario_id, s.nome, s.fase, s.segmento_id, sg.nome as segmento_nome, s.descricao,
                       s.data_fundacao, s.site_url, s.cidade, s.estado, s.video_pitch_url,
                       s.linkedin_url, s.imagem_perfil
                from public.captacao c
                join public.startup s on s.id = c.startup_id
                join public.segmento sg on sg.id = s.segmento_id
                where c.status = 'aberta' and s.fase = 'Tração'
                  and c.id = (select max(c2.id) from public.captacao c2 where c2.startup_id = c.startup_id)
                order by case when exists (
                             select 1 from public.startup_metrica sm where sm.startup_id = s.id
                         ) then 0 else 1 end,
                         c.id desc
                """, (result, row) -> mapOpenRound(result));
        return rounds.stream().map(this::toOpenRoundResponse).toList();
    }

    private void replaceStartupSegments(Long startupId, StartupProfileRequest request) {
        jdbc.update("delete from public.startup_segmento where startup_id = ?", startupId);
        request.segmentosSecundarios().stream()
                .filter(segmentId -> segmentId != request.segmentoId())
                .distinct()
                .forEach(segmentId -> jdbc.update("""
                        insert into public.startup_segmento (startup_id, segmento_id)
                        values (?, ?)
                        """, startupId, segmentId));
    }

    private void saveTraction(Long startupId, StartupProfileRequest request) {
        var traction = request.tracao();
        LocalDate reference = YearMonth.parse(traction.mesReferencia()).atDay(1);
        jdbc.update("""
                insert into public.startup_metrica (
                    startup_id, mes_referencia, receita_mensal, mrr, clientes_ativos,
                    pilotos_ativos, crescimento_mensal, evidencia_tracao
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                on conflict (startup_id, mes_referencia) do update set
                    receita_mensal = excluded.receita_mensal,
                    mrr = excluded.mrr,
                    clientes_ativos = excluded.clientes_ativos,
                    pilotos_ativos = excluded.pilotos_ativos,
                    crescimento_mensal = excluded.crescimento_mensal,
                    evidencia_tracao = excluded.evidencia_tracao
                """, startupId, reference, traction.receitaMensal(), traction.mrr(),
                traction.clientesAtivos(), traction.pilotosAtivos(), traction.crescimentoMensal(),
                traction.evidenciaTracao().trim());
    }

    private void saveRound(Long startupId, StartupProfileRequest request) {
        var round = request.rodada();
        List<Long> existing = jdbc.query("""
                select id from public.captacao where startup_id = ? order by id desc limit 1
                """, (result, row) -> result.getLong("id"), startupId);
        if (existing.isEmpty()) {
            jdbc.update("""
                    insert into public.captacao (
                        startup_id, valor_alvo, valor_captado, percentual_equity_oferecido, status, data_fim
                    ) values (?, ?, ?, ?, ?::public.status_rodada, ?)
                    """, startupId, round.valorAlvo(), round.valorCaptado(),
                    round.percentualEquityOferecido(), round.status(), round.dataFim());
        } else {
            jdbc.update("""
                    update public.captacao
                    set valor_alvo = ?, valor_captado = ?, percentual_equity_oferecido = ?,
                        status = ?::public.status_rodada, data_fim = ?
                    where id = ?
                    """, round.valorAlvo(), round.valorCaptado(), round.percentualEquityOferecido(),
                    round.status(), round.dataFim(), existing.get(0));
        }
    }

    private StartupProfileResponse toStartupResponse(StartupRow row) {
        return new StartupProfileResponse(
                row.nomeResponsavel(), row.nomeStartup(), row.cnpj(), row.fase(), row.segmentoId(),
                row.descricao(), row.videoPitchUrl(), row.dataFundacao(), row.siteUrl(), row.localizacao(),
                row.cidade(), row.estado(), row.latitude(), row.longitude(), row.imagemPerfil(), startupSegmentIds(row.id()),
                row.linkedinUrl(), latestRound(row.id()).orElse(null), latestTraction(row.id()).orElse(null));
    }

    private Optional<StartupProfileResponse.RoundData> latestRound(long startupId) {
        return first(jdbc.query("""
                select valor_alvo, valor_captado, percentual_equity_oferecido, status::text as status, data_fim
                from public.captacao
                where startup_id = ?
                order by id desc
                limit 1
                """, (result, row) -> new StartupProfileResponse.RoundData(
                result.getBigDecimal("valor_alvo"), result.getBigDecimal("valor_captado"),
                result.getBigDecimal("percentual_equity_oferecido"), result.getString("status"),
                result.getObject("data_fim", LocalDate.class)), startupId));
    }

    private Optional<StartupProfileResponse.TractionData> latestTraction(long startupId) {
        return first(jdbc.query("""
                select mes_referencia, receita_mensal, mrr, clientes_ativos, pilotos_ativos,
                       crescimento_mensal, evidencia_tracao
                from public.startup_metrica
                where startup_id = ?
                order by mes_referencia desc, id desc
                limit 1
                """, (result, row) -> mapTraction(result), startupId));
    }

    private List<Long> startupSegmentIds(long startupId) {
        return jdbc.query("""
                select segmento_id
                from public.startup_segmento
                where startup_id = ?
                order by segmento_id
                """, (result, row) -> result.getLong("segmento_id"), startupId);
    }

    private List<String> startupSegmentNames(long startupId) {
        return jdbc.query("""
                select s.nome
                from public.startup_segmento ss
                join public.segmento s on s.id = ss.segmento_id
                where ss.startup_id = ?
                order by s.id
                """, (result, row) -> result.getString("nome"), startupId);
    }

    private List<Long> investorSegments(long investorId) {
        return jdbc.query("""
                select segmento_id
                from public.investidor_segmento
                where investidor_id = ?
                order by segmento_id
                """, (result, row) -> result.getLong("segmento_id"), investorId);
    }

    private List<String> investorSegmentNames(long investorId) {
        return jdbc.query("""
                select s.nome
                from public.investidor_segmento ins
                join public.segmento s on s.id = ins.segmento_id
                where ins.investidor_id = ?
                order by s.id
                """, (result, row) -> result.getString("nome"), investorId);
    }

    private OpenRoundResponse toOpenRoundResponse(OpenRoundRow row) {
        return new OpenRoundResponse(
                row.id(), row.startupId(), row.valorAlvo(), row.valorCaptado(), row.equity(),
                row.status(), row.dataInicio(), null, new OpenRoundResponse.StartupData(
                row.startupId(), row.startupUserId(), row.nomeStartup(), row.fase(), row.segmentoId(), row.segmentoNome(),
                row.descricao(), row.dataFundacao(), row.siteUrl(), row.cidade(), row.estado(),
                row.videoPitchUrl(), row.linkedinUrl(), row.imagemPerfil(), startupSegmentNames(row.startupId()),
                latestTraction(row.startupId()).orElse(null)));
    }

    private static StartupRow mapStartup(ResultSet result) throws SQLException {
        return new StartupRow(
                result.getLong("id"), result.getString("nome_responsavel"), result.getString("nome"),
                result.getString("cnpj"), result.getString("fase"), result.getLong("segmento_id"),
                result.getString("descricao"), result.getString("video_pitch_url"),
                result.getObject("data_fundacao", LocalDate.class), result.getString("site_url"),
                result.getString("localizacao"), result.getString("cidade"), result.getString("estado"),
                nullableDouble(result, "latitude"), nullableDouble(result, "longitude"),
                result.getString("linkedin_url"), result.getString("imagem_perfil"));
    }

    private static StartupProfileResponse.TractionData mapTraction(ResultSet result) throws SQLException {
        LocalDate reference = result.getObject("mes_referencia", LocalDate.class);
        return new StartupProfileResponse.TractionData(
                YearMonth.from(reference).toString(), result.getBigDecimal("receita_mensal"),
                result.getBigDecimal("mrr"), nullableInteger(result, "clientes_ativos"),
                nullableInteger(result, "pilotos_ativos"), result.getBigDecimal("crescimento_mensal"),
                result.getString("evidencia_tracao"));
    }

    private static OpenRoundRow mapOpenRound(ResultSet result) throws SQLException {
        return new OpenRoundRow(
                result.getLong("id"), result.getLong("startup_id"), result.getBigDecimal("valor_alvo"),
                result.getBigDecimal("valor_captado"), result.getBigDecimal("percentual_equity_oferecido"),
                result.getString("status"), result.getObject("data_inicio", LocalDate.class),
                result.getObject("usuario_id", UUID.class),
                result.getString("nome"), result.getString("fase"), result.getLong("segmento_id"),
                result.getString("segmento_nome"), result.getString("descricao"),
                result.getObject("data_fundacao", LocalDate.class), result.getString("site_url"),
                result.getString("cidade"), result.getString("estado"), result.getString("video_pitch_url"),
                result.getString("linkedin_url"), result.getString("imagem_perfil"));
    }

    private static Double nullableDouble(ResultSet result, String column) throws SQLException {
        double value = result.getDouble(column);
        return result.wasNull() ? null : value;
    }

    private static Integer nullableInteger(ResultSet result, String column) throws SQLException {
        int value = result.getInt(column);
        return result.wasNull() ? null : value;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static <T> Optional<T> first(List<T> items) {
        return items.stream().findFirst();
    }

    private record StartupRow(
            long id, String nomeResponsavel, String nomeStartup, String cnpj, String fase,
            long segmentoId, String descricao, String videoPitchUrl, LocalDate dataFundacao,
            String siteUrl, String localizacao, String cidade, String estado, Double latitude,
            Double longitude, String linkedinUrl, String imagemPerfil
    ) {}

    private record StartupDetailsRow(
            long id, String nomeStartup, String fase, long segmentoId, String segmentoNome,
            String descricao, LocalDate dataFundacao, String siteUrl, String cidade, String estado,
            String videoPitchUrl, String linkedinUrl, String imagemPerfil
    ) {}

    private record InvestorRow(
            long id, String nome, String cpf, String tipo, String biografia,
            String linkedinUrl, String localizacao, String cidade, String estado, Double latitude, Double longitude,
            String imagemPerfil, java.math.BigDecimal ticketMin, java.math.BigDecimal ticketMax
    ) {}

    private record OpenRoundRow(
            long id, long startupId, java.math.BigDecimal valorAlvo, java.math.BigDecimal valorCaptado,
            java.math.BigDecimal equity, String status, LocalDate dataInicio, UUID startupUserId, String nomeStartup,
            String fase, long segmentoId, String segmentoNome, String descricao, LocalDate dataFundacao,
            String siteUrl, String cidade, String estado, String videoPitchUrl, String linkedinUrl,
            String imagemPerfil
    ) {}
}
