package com.eclept.MessyNetBanking.chaos;

import java.io.IOException;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.http.MediaType;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import com.eclept.MessyNetBanking.common.Html;
import com.eclept.MessyNetBanking.common.MessyProperties;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

/**
 * Random latency / 503s (when messy.chaos.enabled) plus forced behaviour via X-Mock-Scenario:
 * slow, error, drift, expired. The header applies everywhere; random chaos skips auth, admin and docs.
 */
public class ChaosFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Mock-Scenario";

    private final MessyProperties.Chaos config;
    private final Drift drift;

    public ChaosFilter(MessyProperties.Chaos config, JsonMapper mapper) {
        this.config = config;
        this.drift = new Drift(mapper);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (CorsUtils.isPreFlightRequest(request)) {
            chain.doFilter(request, response);
            return;
        }
        String scenario = request.getHeader(HEADER);
        if (scenario != null && !scenario.isBlank()) {
            switch (scenario.trim().toLowerCase(Locale.ROOT)) {
                case "slow" -> sleep(3000);
                case "error" -> {
                    Html.write503(response);
                    return;
                }
                case "expired" -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentLength(0);
                    return;
                }
                case "drift" -> {
                    driftResponse(request, response, chain);
                    return;
                }
                default -> {
                    // unknown scenario: ignored
                }
            }
            chain.doFilter(request, response);
            return;
        }

        if (config.enabled() && !exempt(request.getRequestURI())) {
            int min = Math.max(0, config.latencyMsMin());
            int max = Math.max(min, config.latencyMsMax());
            sleep(ThreadLocalRandom.current().nextInt(min, max + 1));
            if (ThreadLocalRandom.current().nextDouble() < config.errorRate()) {
                Html.write503(response);
                return;
            }
        }
        chain.doFilter(request, response);
    }

    /** Buffers the response and rewrites JSON bodies; anything else passes through untouched. */
    private void driftResponse(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        ContentCachingResponseWrapper wrapper = new ContentCachingResponseWrapper(response);
        chain.doFilter(request, wrapper);
        byte[] body = wrapper.getContentAsByteArray();
        String contentType = wrapper.getContentType();
        if (body.length > 0 && contentType != null
                && MediaType.APPLICATION_JSON.isCompatibleWith(MediaType.parseMediaType(contentType))) {
            byte[] drifted = drift.apply(body);
            wrapper.resetBuffer();
            wrapper.getOutputStream().write(drifted);
        }
        wrapper.copyBodyToResponse();
    }

    private static boolean exempt(String path) {
        return path.startsWith("/auth/") || path.startsWith("/__admin") || path.startsWith("/v3/api-docs")
                || path.startsWith("/swagger-ui") || path.equals("/error");
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
