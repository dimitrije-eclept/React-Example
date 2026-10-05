package com.eclept.MessyNetBanking.cards;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public final class CardDtos {

    private CardDtos() {
    }

    @Schema(description = "clientId is required by the contract but its value is ignored.")
    public record GetCardsRequest(@JsonProperty("clientId") @Schema(example = "anything") String clientId) {
    }

    public record CardItem(
            @JsonProperty("pan") @Schema(example = "4111********1111") String pan,
            @JsonProperty("expiry") @Schema(example = "12/27", description = "MM/yy") String expiry,
            @JsonProperty("type") @Schema(allowableValues = {"DEBIT", "CREDIT"}) String type,
            @JsonProperty("linkedAcc") String linkedAcc,
            @JsonProperty("blocked") @Schema(allowableValues = {"Y", "N"}) String blocked,
            @JsonProperty("limit") @Schema(nullable = true, example = "150.000,00",
                    description = "sr-RS string; null for debit cards") String limit) {
    }

    public record CardList(@JsonProperty("cardList") List<CardItem> cardList) {
    }

    public record BlockRequest(
            @JsonProperty("pan") @NotBlank(message = "Obavezno polje") String pan,
            @JsonProperty("block") @NotBlank(message = "Obavezno polje")
            @Pattern(regexp = "^[YN]$", message = "Dozvoljene vrednosti su Y ili N")
            @Schema(allowableValues = {"Y", "N"}) String block) {
    }

    public record BlockResult(@JsonProperty("result") @Schema(allowableValues = {"OK", "NOK"}) String result) {
    }
}
