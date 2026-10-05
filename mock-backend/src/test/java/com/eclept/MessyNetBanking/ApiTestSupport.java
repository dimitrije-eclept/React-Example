package com.eclept.MessyNetBanking;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.eclept.MessyNetBanking.common.SeedData;
import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
public abstract class ApiTestSupport {

    protected static final String CURRENT = SeedData.CURRENT;
    protected static final String SAVINGS = SeedData.SAVINGS;
    protected static final String CARD = SeedData.CARD;

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected SeedData seed;

    @BeforeEach
    void resetSeed() {
        seed.reset();
    }

    protected String loginTicket() throws Exception {
        String body = mvc.perform(json(post("/auth/login"), "{\"username\":\"demo\",\"password\":\"demo123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.loginTicket");
    }

    /** Full two-step login; returns the raw /auth/otp body. */
    protected String loginBody() throws Exception {
        return mvc.perform(json(post("/auth/otp"), "{\"ticket\":\"" + loginTicket() + "\",\"otp\":\"123456\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    protected String accessToken() throws Exception {
        return JsonPath.read(loginBody(), "$.access_token");
    }

    protected static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder builder, String body) {
        return builder.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    protected static MockHttpServletRequestBuilder bearer(MockHttpServletRequestBuilder builder, String token) {
        return builder.header("Authorization", "Bearer " + token);
    }

    protected ResultActions authGet(String token, String url, Object... vars) throws Exception {
        return mvc.perform(bearer(get(url, vars), token));
    }

    protected ResultActions authPost(String token, String url, String body) throws Exception {
        return mvc.perform(bearer(json(post(url), body), token));
    }

    protected String availBal(String token, String accNo) throws Exception {
        String body = authGet(token, "/core/v2/acc/{acc}/bal", accNo).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.availBal");
    }

    protected String bookBal(String token, String accNo) throws Exception {
        String body = authGet(token, "/core/v2/acc/{acc}/bal", accNo).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.bookBal");
    }
}
