package com.eclept.MessyNetBanking.common;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.eclept.MessyNetBanking.chaos.ChaosFilter;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.HeaderParameter;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
public class OpenApiConfig {

    private static final Set<String> PUBLIC_PATHS = Set.of("/auth/login", "/auth/otp", "/auth/refresh");

    @Bean
    OpenAPI legacyBankOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("legacy-bank")
                        .version("0.0.1")
                        .description("Deliberately messy mock banking API. Every quirk is intentional; see MESS.md."))
                .components(new Components().addSecuritySchemes("bearer", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer")
                        .description("Opaque access token from /auth/otp or /auth/refresh")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }

    /** Responses every endpoint can produce but no controller declares. */
    @Bean
    OpenApiCustomizer commonResponses() {
        Content error500 = html("Internal Server Error");
        Content error503 = html("Service Unavailable");
        return openApi -> openApi.getPaths().forEach((path, item) -> item.readOperations().forEach(op -> {
            if (!path.startsWith("/__admin")) {
                op.addParametersItem(new HeaderParameter().name(ChaosFilter.HEADER).required(false)
                        .description("Force behaviour: slow | error | drift | expired")
                        .schema(new StringSchema()._enum(List.of("slow", "error", "drift", "expired"))));
            }
            if (!PUBLIC_PATHS.contains(path) && !path.startsWith("/__admin")) {
                op.getResponses().addApiResponse("401", new ApiResponse()
                        .description("Missing/expired access token. **Empty body** (no JSON)."));
            }
            op.getResponses().addApiResponse("500", new ApiResponse()
                    .description("Unhandled error. **HTML body**, not JSON.").content(error500));
            op.getResponses().addApiResponse("503", new ApiResponse()
                    .description("Chaos / X-Mock-Scenario: error. HTML body, header Retry-After: 5.")
                    .content(error503));
        }));
    }

    /**
     * Response bodies always contain every field (nulls included), so mark them all required.
     * ApiError/BusinessError omit absent fields, so only their discriminating fields are required.
     */
    @Bean
    OpenApiCustomizer requiredResponseFields() {
        return openApi -> openApi.getComponents().getSchemas().forEach((name, schema) -> {
            if (name.endsWith("Request") || schema.getProperties() == null) {
                return;
            }
            switch (name) {
                case "ApiError" -> schema.setRequired(List.of("code"));
                case "BusinessError" -> schema.setRequired(List.of("status", "errCode"));
                default -> schema.setRequired(new ArrayList<>(schema.getProperties().keySet()));
            }
        });
    }

    private static Content html(String title) {
        return new Content().addMediaType("text/html",
                new MediaType().schema(new StringSchema().example(Html.page(title))));
    }
}
