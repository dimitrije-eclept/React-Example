package com.eclept.MessyNetBanking.payments;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class PaymentDtos {

    private PaymentDtos() {
    }

    public record DomesticInitRequest(
            @JsonProperty("debtorAcc") @NotBlank(message = "Obavezno polje") String debtorAcc,
            @JsonProperty("creditorIban") @NotBlank(message = "Obavezno polje") @Schema(example = "RS35105008123123123173")
            String creditorIban,
            @JsonProperty("creditorName") @NotBlank(message = "Obavezno polje") @Size(max = 70, message = "Najviše 70 karaktera")
            String creditorName,
            @JsonProperty("amount") @NotNull(message = "Obavezno polje")
            @DecimalMin(value = "0.01", message = "Iznos mora biti veći od nule")
            @Digits(integer = 13, fraction = 2, message = "Najviše dve decimale")
            @Schema(type = "number", example = "1500.5", description = "JSON **number** (internal transfer uses a string)")
            BigDecimal amount,
            @JsonProperty("currency") @NotBlank(message = "Obavezno polje") @Schema(example = "RSD") String currency,
            @JsonProperty("purposeCode") @NotBlank(message = "Obavezno polje")
            @Pattern(regexp = "^\\d{3}$", message = "Šifra plaćanja ima 3 cifre") @Schema(example = "289") String purposeCode,
            @JsonProperty("reference") @Size(max = 35, message = "Najviše 35 karaktera") @Schema(nullable = true, example = "97 123-456")
            String reference,
            @JsonProperty("description") @Size(max = 140, message = "Najviše 140 karaktera") @Schema(nullable = true)
            String description) {
    }

    public record DomesticInitResponse(
            @JsonProperty("paymentRef") @Schema(example = "DOM-20261002-000001") String paymentRef,
            @JsonProperty("scaRequired") @Schema(allowableValues = {"Y", "N"}, description = "Boolean as \"Y\"/\"N\" string") String scaRequired,
            @JsonProperty("scaMethod") @Schema(example = "SMS_OTP") String scaMethod,
            @JsonProperty("maskedPhone") @Schema(example = "+381 64 *** **67") String maskedPhone) {
    }

    public record SignRequest(@JsonProperty("otp") @NotBlank(message = "Obavezno polje") String otp) {
    }

    public record SignResponse(
            @JsonProperty("paymentRef") String paymentRef,
            @JsonProperty("state") @Schema(allowableValues = "PEND") String state) {
    }

    public record PaymentStatus(
            @JsonProperty("paymentRef") String paymentRef,
            @JsonProperty("state") @Schema(allowableValues = {"INIT", "PEND", "EXEC", "REJ", "CANC"}) String state,
            @JsonProperty("stateDt") @Schema(example = "02.10.2026 14:33", description = "dd.MM.yyyy HH:mm, Europe/Belgrade, no zone")
            String stateDt) {
    }
}
