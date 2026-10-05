package com.eclept.MessyNetBanking.profile;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;

public final class ProfileDtos {

    private ProfileDtos() {
    }

    @Schema(description = "Wrapped in an UPPERCASE `USER` key.")
    public record ProfileEnvelope(@JsonProperty("USER") UserProfile user) {
    }

    @Schema(description = "PascalCase mixed with `eMail` and camelCase `lastLogin`.")
    public record UserProfile(
            @JsonProperty("FirstName") @Schema(example = "Marko") String firstName,
            @JsonProperty("LastName") @Schema(example = "Petrović") String lastName,
            @JsonProperty("eMail") @Schema(example = "marko.petrovic@example.rs") String email,
            @JsonProperty("Phone") @Schema(example = "+381641234567", description = "No spaces (maskedPhone elsewhere has spaces)") String phone,
            @JsonProperty("lastLogin") @Schema(example = "1790930000", description = "Epoch SECONDS as a string") String lastLogin) {
    }
}
