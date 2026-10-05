package com.eclept.MessyNetBanking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.eclept.MessyNetBanking.common.SerbianFormat;
import com.jayway.jsonpath.JsonPath;

class TransactionsTest extends ApiTestSupport {

    private static final String URL = "/core/v1/txn/history";

    private String token;

    @BeforeEach
    void login() throws Exception {
        token = accessToken();
    }

    @Test
    void pagingIsOneBasedWithFixedSizeOf20() throws Exception {
        // current account: 36 monthly + 56 card purchases + 3 pending = 95
        authGet(token, URL + "?acc={acc}", CURRENT)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.totalPages").value(5))
                .andExpect(jsonPath("$.items", hasSize(20)));
        authGet(token, URL + "?acc={acc}&page=5&size=100&pageSize=100", CURRENT)
                .andExpect(jsonPath("$.page").value(5))
                .andExpect(jsonPath("$.items", hasSize(15)));
        authGet(token, URL + "?acc={acc}&page=6", CURRENT)
                .andExpect(jsonPath("$.items", hasSize(0)));
        authGet(token, URL + "?acc={acc}&page=0", CURRENT)
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].fld").value("page"));
    }

    @Test
    void amountsArePositiveLocaleStringsAndDatesUseTwoFormats() throws Exception {
        authGet(token, URL + "?acc={acc}", CURRENT)
                .andExpect(jsonPath("$.items[*].amt", everyItem(matchesPattern("^\\d{1,3}(\\.\\d{3})*,\\d{2}$"))))
                .andExpect(jsonPath("$.items[*].bookDate", everyItem(matchesPattern("^\\d{2}\\.\\d{2}\\.\\d{4}$"))))
                .andExpect(jsonPath("$.items[*].valDate", everyItem(matchesPattern("^\\d{8}$"))))
                .andExpect(jsonPath("$.items[*].txnRef", everyItem(matchesPattern("^TX\\d{8}-\\d{6}$"))))
                // the 3 most recent are pending
                .andExpect(jsonPath("$.items[0:3].state", everyItem(is("P"))))
                .andExpect(jsonPath("$.items[3].state").value("B"));
    }

    @Test
    void dcFilter() throws Exception {
        authGet(token, URL + "?acc={acc}&dc=C", CURRENT)
                .andExpect(jsonPath("$.items[*].dc", everyItem(is("C"))))
                .andExpect(jsonPath("$.items", hasSize(6)))
                .andExpect(jsonPath("$.items[0].partnerName").value("ECLEPT D.O.O."));
        authGet(token, URL + "?acc={acc}&dc=D&page=1", CURRENT)
                .andExpect(jsonPath("$.items[*].dc", everyItem(is("D"))))
                .andExpect(jsonPath("$.totalPages").value(5));
        authGet(token, URL + "?acc={acc}&dc=X", CURRENT)
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].fld").value("dc"));
    }

    @Test
    void dateFilterUsesDottedFormat() throws Exception {
        LocalDate today = LocalDate.now(com.eclept.MessyNetBanking.common.MockClock.ZONE);
        LocalDate from = today.minusDays(30);
        LocalDate to = today.minusDays(10);
        String body = authGet(token, URL + "?acc={acc}&dateFrom={f}&dateTo={t}", CURRENT,
                SerbianFormat.dotted(from), SerbianFormat.dotted(to))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> dates = JsonPath.read(body, "$.items[*].bookDate");
        assertThat(dates).isNotEmpty();
        assertThat(dates).allSatisfy(d -> {
            LocalDate date = SerbianFormat.parseDottedDate(d).orElseThrow();
            assertThat(date).isBetween(from, to);
        });

        authGet(token, URL + "?acc={acc}&dateFrom={f}", CURRENT, "2026-09-01")
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.errors[0].fld").value("dateFrom"));
    }

    @Test
    void nullableFieldsArePresentAsNull() throws Exception {
        String body = authGet(token, URL + "?acc={acc}&page=1", CURRENT).andReturn().getResponse().getContentAsString();
        List<Object> partnerAccs = JsonPath.read(body, "$.items[*].partnerAcc");
        assertThat(partnerAccs).hasSize(20).containsNull();
    }

    @Test
    void unknownAccountIs404() throws Exception {
        authGet(token, URL + "?acc=nope")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ACC_NOT_FOUND"));
    }
}
