package com.eclept.MessyNetBanking;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

class MessyNetBankingApplicationTests extends ApiTestSupport {

	@Test
	void contextLoads() {
	}

	@Test
	void openApiYamlDescribesTheMess() throws Exception {
		mvc.perform(get("/v3/api-docs.yaml"))
				.andExpect(status().isOk())
				.andExpect(content().string(containsString("/core/v2/acc/list")))
				.andExpect(content().string(containsString("oneOf")))
				.andExpect(content().string(containsString("BusinessError")))
				.andExpect(content().string(containsString("185.000,00")));
	}

}
