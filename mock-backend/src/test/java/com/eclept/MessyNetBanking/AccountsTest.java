package com.eclept.MessyNetBanking;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.eclept.MessyNetBanking.common.Iban;
import com.jayway.jsonpath.JsonPath;

import static org.assertj.core.api.Assertions.assertThat;

class AccountsTest extends ApiTestSupport {

    @Test
    void listIsBareArrayWithoutBalances() throws Exception {
        String body = authGet(accessToken(), "/core/v2/acc/list")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].acc_no").value(CURRENT))
                .andExpect(jsonPath("$[0].IBAN").value("RS66160000000012345678"))
                .andExpect(jsonPath("$[0].descr").value("Tekući račun"))
                .andExpect(jsonPath("$[0].prodType").value("TR"))
                .andExpect(jsonPath("$[0].ccy").value("RSD"))
                .andExpect(jsonPath("$[0].status").value("A"))
                .andExpect(jsonPath("$[0].openDt").value("2019-03-14T00:00:00"))
                .andExpect(jsonPath("$[1].prodType").value("ST"))
                .andExpect(jsonPath("$[1].ccy").value("EUR"))
                .andExpect(jsonPath("$[2].prodType").value("KK"))
                .andExpect(jsonPath("$[2].descr").value(nullValue()))
                .andReturn().getResponse().getContentAsString();

        List<Map<String, Object>> items = JsonPath.read(body, "$");
        for (Map<String, Object> item : items) {
            assertThat(item.keySet()).containsExactly("acc_no", "IBAN", "descr", "prodType", "ccy", "status", "openDt");
            assertThat(Iban.isValid((String) item.get("IBAN"))).isTrue();
        }
    }

    @Test
    void balanceUsesOtherNamesAndLocaleStrings() throws Exception {
        String token = accessToken();
        authGet(token, "/core/v2/acc/{acc}/bal", CURRENT)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountNumber").value(CURRENT))
                .andExpect(jsonPath("$.availBal").value("185.000,00"))
                .andExpect(jsonPath("$.bookBal").value("186.250,00"))
                .andExpect(jsonPath("$.currency").value("RSD"));
        authGet(token, "/core/v2/acc/{acc}/bal", SAVINGS)
                .andExpect(jsonPath("$.availBal").value("4.200,00"))
                .andExpect(jsonPath("$.currency").value("EUR"));
        authGet(token, "/core/v2/acc/{acc}/bal", CARD)
                .andExpect(jsonPath("$.availBal").value("22.500,00"));

        String body = authGet(token, "/core/v2/acc/{acc}/bal", CURRENT).andReturn().getResponse().getContentAsString();
        assertThat(((Map<String, Object>) JsonPath.read(body, "$")).keySet())
                .containsExactlyInAnyOrder("accountNumber", "availBal", "bookBal", "currency");
    }

    @Test
    void unknownAccountIs404() throws Exception {
        authGet(accessToken(), "/core/v2/acc/{acc}/bal", "160-0000000000000-00")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ACC_NOT_FOUND"));
    }

    @Test
    void seededIbansPassMod97() {
        assertThat(List.of("RS66160000000012345678", "RS59160000000098765432", "RS38160000000055555511",
                "RS81999000000000000099")).allMatch(Iban::isValid);
        assertThat(Iban.isValid("RS35160000000012345678")).isFalse();
    }

}
