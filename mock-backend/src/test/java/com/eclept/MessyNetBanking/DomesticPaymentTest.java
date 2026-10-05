package com.eclept.MessyNetBanking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

import com.eclept.MessyNetBanking.payments.PaymentService;
import com.jayway.jsonpath.JsonPath;

@TestPropertySource(properties = "messy.payments.execution-delay-seconds=1")
class DomesticPaymentTest extends ApiTestSupport {

    private static final String VALID_IBAN = "RS35105008123123123173";

    private String token;

    @BeforeEach
    void login() throws Exception {
        token = accessToken();
    }

    private String init(String debtor, String iban, String amount) throws Exception {
        String body = authPost(token, "/pay/dom/init", "{\"debtorAcc\":\"" + debtor + "\",\"creditorIban\":\"" + iban
                + "\",\"creditorName\":\"Pera Perić\",\"amount\":" + amount + ",\"currency\":\"RSD\","
                + "\"purposeCode\":\"289\",\"reference\":\"97 123-456\",\"description\":\"Kirija\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentRef").value(matchesPattern("^DOM-\\d{8}-\\d{6}$")))
                .andExpect(jsonPath("$.scaRequired").value("Y"))
                .andExpect(jsonPath("$.scaMethod").value("SMS_OTP"))
                .andExpect(jsonPath("$.maskedPhone").value("+381 64 *** **67"))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.paymentRef");
    }

    private void sign(String ref) throws Exception {
        authPost(token, "/pay/dom/" + ref + "/sign", "{\"otp\":\"123456\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentRef").value(ref))
                .andExpect(jsonPath("$.state").value("PEND"));
    }

    private void timeTravel(int seconds) throws Exception {
        mvc.perform(post("/__admin/time-travel?seconds=" + seconds)).andExpect(status().isOk());
    }

    @Test
    void initSignPendThenExec() throws Exception {
        String ref = init(CURRENT, VALID_IBAN, "1500.5");
        authGet(token, "/pay/dom/{ref}/stat", ref)
                .andExpect(jsonPath("$.state").value("INIT"))
                .andExpect(jsonPath("$.stateDt").value(matchesPattern("^\\d{2}\\.\\d{2}\\.\\d{4} \\d{2}:\\d{2}$")));

        sign(ref);
        authGet(token, "/pay/dom/{ref}/stat", ref).andExpect(jsonPath("$.state").value("PEND"));
        assertThat(availBal(token, CURRENT)).isEqualTo("183.499,50");
        assertThat(bookBal(token, CURRENT)).isEqualTo("186.250,00");
        authGet(token, "/core/v1/txn/history?acc={acc}", CURRENT)
                .andExpect(jsonPath("$.items[0].state").value("P"))
                .andExpect(jsonPath("$.items[0].amt").value("1.500,50"))
                .andExpect(jsonPath("$.items[0].partnerAcc").value(VALID_IBAN));

        timeTravel(2);
        authGet(token, "/pay/dom/{ref}/stat", ref).andExpect(jsonPath("$.state").value("EXEC"));
        assertThat(availBal(token, CURRENT)).isEqualTo("183.499,50");
        assertThat(bookBal(token, CURRENT)).isEqualTo("184.749,50");
        authGet(token, "/core/v1/txn/history?acc={acc}&dc=D&page=1", CURRENT)
                .andExpect(jsonPath("$.items[?(@.partnerAcc == '" + VALID_IBAN + "')].state").value("B"));
    }

    @Test
    void execHappensInRealTimeToo() throws Exception {
        String ref = init(CURRENT, VALID_IBAN, "100");
        sign(ref);
        Thread.sleep(1300);
        authGet(token, "/pay/dom/{ref}/stat", ref).andExpect(jsonPath("$.state").value("EXEC"));
    }

    @Test
    void rejectIbanEndsInRejAndReleasesReservation() throws Exception {
        String ref = init(CURRENT, PaymentService.REJECT_IBAN, "5000");
        sign(ref);
        assertThat(availBal(token, CURRENT)).isEqualTo("180.000,00");

        timeTravel(2);
        authGet(token, "/pay/dom/{ref}/stat", ref).andExpect(jsonPath("$.state").value("REJ"));
        assertThat(availBal(token, CURRENT)).isEqualTo("185.000,00");
        assertThat(bookBal(token, CURRENT)).isEqualTo("186.250,00");
    }

    @Test
    void wrongOtpThreeTimesLocksAndCancels() throws Exception {
        String ref = init(CURRENT, VALID_IBAN, "100");
        String url = "/pay/dom/" + ref + "/sign";
        authPost(token, url, "{\"otp\":\"111111\"}")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("OTP_INVALID"))
                .andExpect(jsonPath("$.attemptsLeft").value(2));
        authPost(token, url, "{\"otp\":\"111111\"}")
                .andExpect(jsonPath("$.attemptsLeft").value(1));
        authPost(token, url, "{\"otp\":\"111111\"}")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("OTP_LOCKED"));
        authGet(token, "/pay/dom/{ref}/stat", ref).andExpect(jsonPath("$.state").value("CANC"));
        authPost(token, url, "{\"otp\":\"123456\"}").andExpect(status().isConflict());
        assertThat(availBal(token, CURRENT)).isEqualTo("185.000,00");
    }

    @Test
    void insufficientFundsDetectedAtSignAs200() throws Exception {
        String ref = init(CARD, VALID_IBAN, "999999.99");
        authPost(token, "/pay/dom/" + ref + "/sign", "{\"otp\":\"123456\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.errCode").value("ERR_FUNDS"));
        authGet(token, "/pay/dom/{ref}/stat", ref).andExpect(jsonPath("$.state").value("REJ"));
    }

    @Test
    void invalidIbanIs422() throws Exception {
        authPost(token, "/pay/dom/init", "{\"debtorAcc\":\"" + CURRENT + "\",\"creditorIban\":\"RS35160000000012345678\","
                + "\"creditorName\":\"X\",\"amount\":10,\"currency\":\"RSD\",\"purposeCode\":\"289\"}")
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].fld").value("creditorIban"));
    }

    @Test
    void unknownPaymentIs404() throws Exception {
        authGet(token, "/pay/dom/{ref}/stat", "DOM-NOPE")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PAY_NOT_FOUND"));
    }
}
