package com.eclept.MessyNetBanking.chaos;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

import com.eclept.MessyNetBanking.common.MessyProperties;

import tools.jackson.databind.json.JsonMapper;

@Configuration
public class ChaosConfig {

    /** Runs right after the CORS filter so chaos responses still carry CORS headers. */
    @Bean
    FilterRegistrationBean<ChaosFilter> chaosFilter(MessyProperties properties, JsonMapper mapper) {
        FilterRegistrationBean<ChaosFilter> registration = new FilterRegistrationBean<>(new ChaosFilter(properties.chaos(), mapper));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        return registration;
    }
}
