package com.eclept.MessyNetBanking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

class AdminResetTest extends ApiTestSupport {

    @Test
    void resetRestoresBalancesAndInvalidatesTokens() throws Exception {
        String token = accessToken();
        mvc.perform(bearer(json(post("/pay/internal/exec"),
                "{\"srcAcc\":\"" + CURRENT + "\",\"dstAcc\":\"" + CARD + "\",\"amt\":\"5000\",\"ccy\":\"RSD\"}"), token)
                .header("Idempotency-Key", "reset-test"))
                .andExpect(jsonPath("$.ref").exists());
        assertThat(availBal(token, CURRENT)).isEqualTo("180.000,00");
        mvc.perform(get("/__admin/state"))
                .andExpect(jsonPath("$.activeSessions").value(1))
                .andExpect(jsonPath("$.transactionCount").value(122));

        mvc.perform(post("/__admin/reset")).andExpect(status().isOk());

        authGet(token, "/core/v2/acc/list").andExpect(status().isUnauthorized());
        String fresh = accessToken();
        assertThat(availBal(fresh, CURRENT)).isEqualTo("185.000,00");
        assertThat(availBal(fresh, CARD)).isEqualTo("22.500,00");
        mvc.perform(get("/__admin/state"))
                .andExpect(jsonPath("$.balances[0].available").value(185000.00))
                .andExpect(jsonPath("$.transactionCount").value(120))
                .andExpect(jsonPath("$.activeSessions").value(1));
    }
}
