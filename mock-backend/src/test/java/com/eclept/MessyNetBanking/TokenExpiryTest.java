package com.eclept.MessyNetBanking;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

import com.jayway.jsonpath.JsonPath;

@TestPropertySource(properties = "messy.auth.access-ttl-seconds=1")
class TokenExpiryTest extends ApiTestSupport {

    @Test
    void expiredAccessTokenIs401WithEmptyBody() throws Exception {
        String body = loginBody();
        String token = JsonPath.read(body, "$.access_token");
        Integer expiresIn = JsonPath.read(body, "$.expires_in");
        org.assertj.core.api.Assertions.assertThat(expiresIn).isEqualTo(1);

        authGet(token, "/core/v2/acc/list").andExpect(status().isOk());
        Thread.sleep(1500);
        authGet(token, "/core/v2/acc/list")
                .andExpect(status().isUnauthorized())
                .andExpect(content().string(""));
    }

    @Test
    void refreshRotatesAndOldRefreshTokenIsRejected() throws Exception {
        String oldRefresh = JsonPath.read(loginBody(), "$.refresh_token");
        Thread.sleep(1500);

        String rotated = mvc.perform(json(post("/auth/refresh"), "{\"refresh_token\":\"" + oldRefresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isString())
                .andExpect(jsonPath("$.token_type").value("bearer"))
                .andReturn().getResponse().getContentAsString();
        String newAccess = JsonPath.read(rotated, "$.access_token");
        String newRefresh = JsonPath.read(rotated, "$.refresh_token");
        org.assertj.core.api.Assertions.assertThat(newRefresh).isNotEqualTo(oldRefresh);

        authGet(newAccess, "/core/v2/acc/list").andExpect(status().isOk());

        mvc.perform(json(post("/auth/refresh"), "{\"refresh_token\":\"" + oldRefresh + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("invalid_grant"));

        mvc.perform(json(post("/auth/refresh"), "{\"refresh_token\":\"" + newRefresh + "\"}"))
                .andExpect(status().isOk());
    }
}
