package com.eclept.MessyNetBanking;

import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

class AuthFlowTest extends ApiTestSupport {

    @Test
    void loginThenOtpThenProtectedEndpoint() throws Exception {
        mvc.perform(json(post("/auth/login"), "{\"username\":\"demo\",\"password\":\"demo123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loginTicket").isString())
                .andExpect(jsonPath("$.otpRequired").value(true))
                .andExpect(jsonPath("$.otpChannel").value("SMS"))
                .andExpect(jsonPath("$.maskedPhone").value("+381 64 *** **67"))
                .andExpect(jsonPath("$", not(hasKey("access_token"))));

        String ticket = loginTicket();
        String body = mvc.perform(json(post("/auth/otp"), "{\"ticket\":\"" + ticket + "\",\"otp\":\"123456\"}"))
                .andExpect(status().isOk())
                // snake_case, unlike /auth/login
                .andExpect(jsonPath("$.access_token").isString())
                .andExpect(jsonPath("$.refresh_token").isString())
                .andExpect(jsonPath("$.expires_in").value(300))
                .andExpect(jsonPath("$.token_type").value("bearer"))
                .andExpect(jsonPath("$", not(hasKey("accessToken"))))
                .andReturn().getResponse().getContentAsString();
        String token = com.jayway.jsonpath.JsonPath.read(body, "$.access_token");

        authGet(token, "/core/v2/acc/list").andExpect(status().isOk());

        // ticket is single-use
        mvc.perform(json(post("/auth/otp"), "{\"ticket\":\"" + ticket + "\",\"otp\":\"123456\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("TICKET_INVALID"));
    }

    @Test
    void wrongPasswordIs401WithJsonBody() throws Exception {
        mvc.perform(json(post("/auth/login"), "{\"username\":\"demo\",\"password\":\"nope\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_FAILED"))
                .andExpect(jsonPath("$.message").value("Neispravni podaci"));
    }

    @Test
    void missingTokenIs401WithEmptyBody() throws Exception {
        mvc.perform(get("/core/v2/acc/list"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string(""));
        mvc.perform(bearer(get("/core/v2/acc/list"), "garbage"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string(""));
    }

    @Test
    void wrongOtpThreeTimesLocksAndKillsTicket() throws Exception {
        String ticket = loginTicket();
        String wrong = "{\"ticket\":\"" + ticket + "\",\"otp\":\"000000\"}";

        mvc.perform(json(post("/auth/otp"), wrong))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("OTP_INVALID"))
                .andExpect(jsonPath("$.attemptsLeft").value(2));
        mvc.perform(json(post("/auth/otp"), wrong))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("OTP_INVALID"))
                .andExpect(jsonPath("$.attemptsLeft").value(1));
        mvc.perform(json(post("/auth/otp"), wrong))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("OTP_LOCKED"))
                .andExpect(jsonPath("$", not(hasKey("attemptsLeft"))));

        // even the right OTP no longer works: the ticket is dead
        mvc.perform(json(post("/auth/otp"), "{\"ticket\":\"" + ticket + "\",\"otp\":\"123456\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("TICKET_INVALID"));
    }

    @Test
    void logoutInvalidatesToken() throws Exception {
        String token = accessToken();
        mvc.perform(bearer(post("/auth/logout"), token))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        authGet(token, "/core/v2/acc/list").andExpect(status().isUnauthorized());
    }

    @Test
    void profileHasOddWrapperAndCasing() throws Exception {
        authGet(accessToken(), "/usr/profile")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.USER.FirstName").value("Marko"))
                .andExpect(jsonPath("$.USER.LastName").value("Petrović"))
                .andExpect(jsonPath("$.USER.eMail").value("marko.petrovic@example.rs"))
                .andExpect(jsonPath("$.USER.Phone").value("+381641234567"))
                .andExpect(jsonPath("$.USER.lastLogin").isString())
                .andExpect(jsonPath("$.USER.lastLogin").value(org.hamcrest.Matchers.matchesPattern("^\\d{10}$")));
    }

    @Test
    void cardsAreReadViaPostWithYnFlags() throws Exception {
        String token = accessToken();
        authPost(token, "/cards/getCards", "{\"clientId\":\"whatever\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cardList[0].pan").value("4111********1111"))
                .andExpect(jsonPath("$.cardList[0].type").value("DEBIT"))
                .andExpect(jsonPath("$.cardList[0].blocked").value("N"))
                .andExpect(jsonPath("$.cardList[0].limit").doesNotExist())
                .andExpect(jsonPath("$.cardList[0]", hasKey("limit")))
                .andExpect(jsonPath("$.cardList[1].type").value("CREDIT"));

        authPost(token, "/cards/block", "{\"pan\":\"4111********1111\",\"block\":\"Y\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("OK"));
        authPost(token, "/cards/getCards", "{\"clientId\":\"x\"}")
                .andExpect(jsonPath("$.cardList[0].blocked").value("Y"));
    }
}
