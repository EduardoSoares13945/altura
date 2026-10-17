package com.altura.api.service;

import com.altura.api.dto.InvestorProfileResponse;
import com.altura.api.dto.OpenRoundResponse;
import com.altura.api.dto.SegmentResponse;
import com.altura.api.dto.StartupProfileResponse;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class MatchCalculatorTest {
    private final MatchCalculator calculator = new MatchCalculator();

    @Test
    void awardsAllPointsWhenThesisTicketTractionAndLocationAlign() {
        var result = calculator.calculate(roundWithTraction("PE"), investor(
                List.of(1L, 2L, 3L), "PE", "100000", "600000"), catalog());

        assertThat(result.percentual()).isEqualTo(100);
        assertThat(result.segmentos()).isEqualTo(35);
        assertThat(result.investimento()).isEqualTo(30);
        assertThat(result.tracao()).isEqualTo(25);
        assertThat(result.localizacao()).isEqualTo(10);
        assertThat(result.motivos()).allMatch(item -> item.positivo());
    }

    @Test
    void returnsZeroWhenNoRelevantFactorMatches() {
        OpenRoundResponse base = roundWithTraction("PE");
        OpenRoundResponse withoutTraction = new OpenRoundResponse(base.id(), base.startupId(),
                base.valorAlvo(), base.valorCaptado(), base.percentualEquityOferecido(), base.status(),
                base.dataInicio(), null, new OpenRoundResponse.StartupData(base.startup().id(),
                base.startup().usuarioId(), base.startup().nomeStartup(), base.startup().fase(),
                base.startup().segmentoId(), base.startup().segmentoNome(), base.startup().descricao(),
                base.startup().dataFundacao(), base.startup().siteUrl(), base.startup().cidade(), "PE",
                null, null, null, List.of(), null));

        var result = calculator.calculate(withoutTraction,
                investor(List.of(3L), "SP", "1000", "2000"), catalog());

        assertThat(result.percentual()).isZero();
        assertThat(result.motivos()).noneMatch(item -> item.positivo());
    }

    private OpenRoundResponse roundWithTraction(String state) {
        var traction = new StartupProfileResponse.TractionData(YearMonth.now().toString(),
                new BigDecimal("85000"), new BigDecimal("72000"), 68, 2,
                new BigDecimal("18.5"), "Tração comprovada.");
        var startup = new OpenRoundResponse.StartupData(7L, UUID.randomUUID(), "StartFlow",
                "Tração", 1L, "Software e serviços digitais", "Descrição", LocalDate.of(2022, 4, 1),
                null, "Recife", state, null, null, null, List.of("Finanças", "Saúde"), traction);
        return new OpenRoundResponse(11L, 7L, new BigDecimal("500000"), BigDecimal.ZERO,
                new BigDecimal("10"), "aberta", LocalDate.now(), null, startup);
    }

    private InvestorProfileResponse investor(List<Long> segments, String state, String min, String max) {
        return new InvestorProfileResponse("Investidor", "00000000000", "anjo", "Bio", segments,
                null, state, "Recife", state, null, null, null,
                new BigDecimal(min), new BigDecimal(max));
    }

    private List<SegmentResponse> catalog() {
        return List.of(new SegmentResponse(1L, "Software e serviços digitais"),
                new SegmentResponse(2L, "Finanças"), new SegmentResponse(3L, "Saúde"));
    }
}
