package com.eclept.MessyNetBanking;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class ErrorAndChaosTest extends ApiTestSupport {

    @Test
    void unhandledErrorIs500WithHtmlBody() throws Exception {
        mvc.perform(get("/__admin/boom").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string("<html><body><h1>Internal Server Error</h1></body></html>"));
    }

    @Test
    void driftRenamesAField() throws Exception {
        String token = accessToken();
        authGet(token, "/core/v2/acc/list")
                .andExpect(jsonPath("$[0].acc_no").exists());
        mvc.perform(bearer(get("/core/v2/acc/list"), token).header("X-Mock-Scenario", "drift"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].acc_no").doesNotExist())
                .andExpect(jsonPath("$[0].acc_no_v2").value(CURRENT))
                .andExpect(jsonPath("$[2].acc_no_v2").value(CARD));
        mvc.perform(bearer(get("/core/v2/acc/{acc}/bal", CURRENT), token).header("X-Mock-Scenario", "drift"))
                .andExpect(jsonPath("$.accountNumber").doesNotExist())
                .andExpect(jsonPath("$.accountNumber_v2").value(CURRENT))
                .andExpect(jsonPath("$.availBal").value("185.000,00"));
    }

    @Test
    void expiredScenarioIs401EvenWithValidToken() throws Exception {
        String token = accessToken();
        mvc.perform(bearer(get("/core/v2/acc/list"), token).header("X-Mock-Scenario", "expired"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string(""));
    }

    @Test
    void errorScenarioIs503HtmlWithRetryAfter() throws Exception {
        mvc.perform(get("/core/v2/acc/list").header("X-Mock-Scenario", "error"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Retry-After", "5"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(containsString("Service Unavailable")));
    }

    @Test
    void corsAllowsViteDevServer() throws Exception {
        mvc.perform(options("/pay/internal/exec")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Authorization, Idempotency-Key, X-Mock-Scenario"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(get("/core/v2/acc/list").header("Origin", "http://localhost:5173"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
