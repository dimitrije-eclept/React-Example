package com.eclept.MessyNetBanking.accounts;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;

public final class AccountDtos {

    private AccountDtos() {
    }

    @Schema(description = "Account list entry. No balances here; fetch /bal per account.")
    public record AccountListItem(
            @JsonProperty("acc_no") @Schema(example = "160-0000000123456-78") String accNo,
            @JsonProperty("IBAN") @Schema(example = "RS66160000000012345678") String iban,
            @JsonProperty("descr") @Schema(nullable = true, example = "Tekući račun") String descr,
            @JsonProperty("prodType") @Schema(allowableValues = {"TR", "ST", "KK"},
                    description = "TR=current, ST=savings, KK=card") String prodType,
            @JsonProperty("ccy") @Schema(example = "RSD") String ccy,
            @JsonProperty("status") @Schema(allowableValues = {"A", "B"}, description = "A=active, B=blocked") String status,
            @JsonProperty("openDt") @Schema(example = "2019-03-14T00:00:00",
                    description = "Local date-time, no timezone") String openDt) {
    }

    @Schema(description = "Balances are strings in sr-RS format: '.' thousands, ',' decimals.")
    public record Balance(
            @JsonProperty("accountNumber") @Schema(example = "160-0000000123456-78") String accountNumber,
            @JsonProperty("availBal") @Schema(example = "185.000,00", pattern = "^-?\\d{1,3}(\\.\\d{3})*,\\d{2}$") String availBal,
            @JsonProperty("bookBal") @Schema(example = "186.250,00", pattern = "^-?\\d{1,3}(\\.\\d{3})*,\\d{2}$") String bookBal,
            @JsonProperty("currency") @Schema(example = "RSD") String currency) {
    }
}
