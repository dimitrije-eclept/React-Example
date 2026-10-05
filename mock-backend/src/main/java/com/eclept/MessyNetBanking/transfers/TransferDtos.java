package com.eclept.MessyNetBanking.transfers;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class TransferDtos {

    private TransferDtos() {
    }

    public record InternalTransferRequest(
            @JsonProperty("srcAcc") @NotBlank(message = "Obavezno polje") String srcAcc,
            @JsonProperty("dstAcc") @NotBlank(message = "Obavezno polje") String dstAcc,
            @JsonProperty("amt") @NotBlank(message = "Obavezno polje")
            @Pattern(regexp = "^\\d{1,13}(\\.\\d{1,2})?$", message = "Iznos u formatu 1500.50")
            @Schema(example = "1500.50", description = "String with DOT decimal separator (responses use \"1.500,50\")")
            String amt,
            @JsonProperty("ccy") @NotBlank(message = "Obavezno polje")
            @Pattern(regexp = "^[A-Z]{3}$", message = "Neispravna valuta") @Schema(example = "RSD") String ccy,
            @JsonProperty("descr") @Size(max = 140, message = "Najviše 140 karaktera") @Schema(nullable = true, example = "Štednja")
            String descr) {
    }

    public record TransferOk(
            @JsonProperty("ref") @Schema(example = "INT-20261002-000001") String ref,
            @JsonProperty("ts") @Schema(example = "2026-10-02T14:31:07+02:00") String ts) {
    }
}
