package com.eclept.MessyNetBanking.auth;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @JsonProperty("username") @NotBlank String username,
            @JsonProperty("password") @NotBlank String password) {
    }

    @Schema(description = "camelCase, and otpRequired is a real boolean (unlike the Y/N strings elsewhere).")
    public record LoginResponse(
            @JsonProperty("loginTicket") String loginTicket,
            @JsonProperty("otpRequired") boolean otpRequired,
            @JsonProperty("otpChannel") @Schema(example = "SMS") String otpChannel,
            @JsonProperty("maskedPhone") @Schema(example = "+381 64 *** **67") String maskedPhone) {
    }

    public record OtpRequest(
            @JsonProperty("ticket") @NotBlank String ticket,
            @JsonProperty("otp") @NotBlank String otp) {
    }

    public record RefreshRequest(@JsonProperty("refresh_token") @NotBlank String refreshToken) {
    }

    @Schema(description = "snake_case, unlike the rest of /auth.")
    public record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("expires_in") @Schema(example = "300") long expiresIn,
            @JsonProperty("token_type") @Schema(example = "bearer") String tokenType) {
    }

    @Schema(description = "OAuth-style error, only used by /auth/refresh.")
    public record OAuthError(@JsonProperty("error") @Schema(example = "invalid_grant") String error) {
    }
}
