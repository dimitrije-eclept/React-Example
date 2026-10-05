package com.eclept.MessyNetBanking.common;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("messy")
public record MessyProperties(@DefaultValue Auth auth, @DefaultValue Payments payments, @DefaultValue Chaos chaos) {

    public record Auth(
            @DefaultValue("300") long accessTtlSeconds,
            @DefaultValue("1800") long refreshTtlSeconds,
            @DefaultValue("300") long ticketTtlSeconds) {
    }

    public record Payments(@DefaultValue("10") long executionDelaySeconds) {
    }

    public record Chaos(
            @DefaultValue("false") boolean enabled,
            @DefaultValue("100") int latencyMsMin,
            @DefaultValue("600") int latencyMsMax,
            @DefaultValue("0.05") double errorRate) {
    }
}
