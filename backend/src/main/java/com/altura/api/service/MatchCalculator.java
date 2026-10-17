package com.altura.api.service;

import com.altura.api.dto.InvestorProfileResponse;
import com.altura.api.dto.MatchScoreResponse;
import com.altura.api.dto.OpenRoundResponse;
import com.altura.api.dto.SegmentResponse;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class MatchCalculator {
    public MatchScoreResponse calculate(OpenRoundResponse round, InvestorProfileResponse investor,
                                        List<SegmentResponse> catalog) {
        Set<String> interests = catalog.stream()
                .filter(item -> investor.segmentos().contains(item.id()))
                .map(item -> normalize(item.nome()))
                .collect(Collectors.toSet());
        boolean primary = investor.segmentos().contains(round.startup().segmentoId());
        long secondary = round.startup().segmentosSecundarios().stream()
                .filter(item -> interests.contains(normalize(item))).count();
        int segments = Math.min(35, (primary ? 25 : 0) + Math.min(10, Math.toIntExact(secondary * 5)));

        BigDecimal remaining = round.valorAlvo().subtract(round.valorCaptado()).max(BigDecimal.ZERO);
        int investment = 0;
        if (remaining.signum() > 0 && remaining.compareTo(investor.ticketMin()) >= 0
                && remaining.compareTo(investor.ticketMax()) <= 0) investment = 30;
        else if (remaining.signum() > 0 && investor.ticketMin().compareTo(remaining) > 0) investment = 15;
        else if (remaining.signum() > 0) {
            BigDecimal coverage = investor.ticketMax().divide(remaining, 4, java.math.RoundingMode.HALF_UP);
            if (coverage.compareTo(new BigDecimal("0.10")) >= 0) investment = 20;
            else if (coverage.compareTo(new BigDecimal("0.05")) >= 0) investment = 10;
        }

        int traction = tractionScore(round.startup().tracao());
        int location = investor.estado() != null && investor.estado().equals(round.startup().estado()) ? 10 : 0;
        int total = segments + investment + traction + location;

        List<MatchScoreResponse.Reason> reasons = List.of(
                new MatchScoreResponse.Reason(primary ? "Segmento principal alinhado à sua tese."
                        : secondary > 0 ? secondary + " segmento(s) secundário(s) compartilhado(s)."
                        : "Nenhum segmento compartilhado.", segments > 0),
                new MatchScoreResponse.Reason(investment == 30 ? "Capital restante compatível com sua faixa de investimento."
                        : investment > 0 ? "Sua faixa cobre parte relevante do capital restante."
                        : "Faixa de investimento pouco compatível com o capital restante.", investment > 0),
                new MatchScoreResponse.Reason(traction >= 20 ? "Tração recente com múltiplos sinais reais."
                        : traction > 0 ? "A startup possui sinais de tração, com espaço para aprofundar a análise."
                        : "Não há dados suficientes de tração para pontuar.", traction > 0),
                new MatchScoreResponse.Reason(location == 10 ? "Startup localizada no mesmo estado."
                        : "Startup localizada em outro estado.", location > 0)
        );
        return new MatchScoreResponse(total, segments, investment, traction, location, reasons);
    }

    private int tractionScore(com.altura.api.dto.StartupProfileResponse.TractionData traction) {
        if (traction == null) return 0;
        int score = 0;
        int months = monthsSince(traction.mesReferencia());
        score += months <= 3 ? 10 : months <= 6 ? 7 : months <= 12 ? 4 : 0;
        long signals = java.util.stream.Stream.of(
                        traction.receitaMensal(), traction.mrr(), traction.clientesAtivos(), traction.pilotosAtivos())
                .filter(value -> value != null && new BigDecimal(value.toString()).signum() > 0).count();
        score += Math.min(10, (int) Math.round(signals * 2.5));
        if (traction.crescimentoMensal() != null && traction.crescimentoMensal().signum() > 0) score += 5;
        return score;
    }

    private int monthsSince(String reference) {
        try {
            YearMonth value = YearMonth.parse(reference);
            YearMonth now = YearMonth.now();
            return Math.max(0, (now.getYear() - value.getYear()) * 12 + now.getMonthValue() - value.getMonthValue());
        } catch (DateTimeParseException exception) {
            return 99;
        }
    }

    private String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }
}
