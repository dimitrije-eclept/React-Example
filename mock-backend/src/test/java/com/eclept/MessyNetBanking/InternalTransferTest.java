package com.eclept.MessyNetBanking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

class InternalTransferTest extends ApiTestSupport {

    private static final String URL = "/pay/internal/exec";

    private String token;

    @BeforeEach
    void login() throws Exception {
        token = accessToken();
    }

    private ResultActions transfer(String key, String body) throws Exception {
        var request = bearer(json(post(URL), body), token);
        if (key != null) {
            request.header("Idempotency-Key", key);
        }
        return mvc.perform(request);
    }

    private static String body(String src, String dst, String amt, String ccy) {
        return "{\"srcAcc\":\"" + src + "\",\"dstAcc\":\"" + dst + "\",\"amt\":\"" + amt + "\",\"ccy\":\"" + ccy
                + "\",\"descr\":\"Štednja\"}";
    }

    @Test
    void successMovesMoneyAndAddsTwoTransactions() throws Exception {
        transfer("k-1", body(CURRENT, CARD, "1500.50", "RSD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ref").value(matchesPattern("^INT-\\d{8}-\\d{6}$")))
                .andExpect(jsonPath("$.ts").value(matchesPattern("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}$")))
                .andExpect(jsonPath("$.status").doesNotExist());

        assertThat(availBal(token, CURRENT)).isEqualTo("183.499,50");
        assertThat(bookBal(token, CURRENT)).isEqualTo("184.749,50");
        assertThat(availBal(token, CARD)).isEqualTo("24.000,50");

        authGet(token, "/core/v1/txn/history?acc={acc}&dc=C", CARD)
                .andExpect(jsonPath("$.items[0].amt").value("1.500,50"))
                .andExpect(jsonPath("$.items[0].partnerAcc").value(CURRENT))
                .andExpect(jsonPath("$.items[0].purpose").value("Štednja"));
        authGet(token, "/core/v1/txn/history?acc={acc}", CURRENT)
                .andExpect(jsonPath("$.items[0].dc").value("D"))
                .andExpect(jsonPath("$.items[0].amt").value("1.500,50"));
    }

    @Test
    void insufficientFundsIs200WithErrorBody() throws Exception {
        transfer("k-funds", body(CARD, CURRENT, "999999.00", "RSD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.errCode").value("ERR_FUNDS"))
                .andExpect(jsonPath("$.errMsg").value("Nedovoljno sredstava"));
        assertThat(availBal(token, CARD)).isEqualTo("22.500,00");
    }

    @Test
    void currencyMismatchIs200WithErrCcy() throws Exception {
        transfer("k-ccy", body(CURRENT, SAVINGS, "100.00", "RSD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.errCode").value("ERR_CCY"))
                .andExpect(jsonPath("$.errMsg").doesNotExist());
    }

    @Test
    void replayReturnsOriginalResponseWithoutMovingMoneyTwice() throws Exception {
        String first = transfer("same-key", body(CURRENT, CARD, "1000.00", "RSD"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String second = transfer("same-key", body(CURRENT, CARD, "1000.00", "RSD"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertThat(second).isEqualTo(first);
        assertThat(availBal(token, CURRENT)).isEqualTo("184.000,00");
        assertThat(availBal(token, CARD)).isEqualTo("23.500,00");
    }

    @Test
    void missingIdempotencyKeyIs400() throws Exception {
        transfer(null, body(CURRENT, CARD, "10.00", "RSD"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_MISSING"));
        assertThat(availBal(token, CURRENT)).isEqualTo("185.000,00");
    }

    @Test
    void localeFormattedAmountInRequestIs422() throws Exception {
        transfer("k-422", body(CURRENT, CARD, "1.500,50", "RSD"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].fld").value("amt"))
                .andExpect(jsonPath("$.errors[0].msg").isString());
        transfer("k-422b", body(CURRENT, CARD, "0.00", "RSD"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].fld").value("amt"));
    }
}
