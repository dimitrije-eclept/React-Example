package com.eclept.MessyNetBanking.transactions;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;

public final class TransactionDtos {

    private TransactionDtos() {
    }

    public record TxnItem(
            @JsonProperty("txnRef") @Schema(example = "TX20260914-000123") String txnRef,
            @JsonProperty("bookDate") @Schema(example = "14.09.2026", description = "dd.MM.yyyy") String bookDate,
            @JsonProperty("valDate") @Schema(example = "20260915", description = "yyyyMMdd (different from bookDate!)") String valDate,
            @JsonProperty("amt") @Schema(example = "3.499,99", description = "Always positive, sr-RS string. Sign is in dc.") String amt,
            @JsonProperty("dc") @Schema(allowableValues = {"D", "C"}) String dc,
            @JsonProperty("ccy") @Schema(example = "RSD") String ccy,
            @JsonProperty("partnerName") @Schema(nullable = true, example = "MAXI 112") String partnerName,
            @JsonProperty("partnerAcc") @Schema(nullable = true) String partnerAcc,
            @JsonProperty("purpose") @Schema(nullable = true, example = "Kupovina karticom") String purpose,
            @JsonProperty("state") @Schema(allowableValues = {"B", "P"}, description = "B=booked, P=pending") String state) {
    }

    public record TxnPage(
            @JsonProperty("items") List<TxnItem> items,
            @JsonProperty("page") @Schema(description = "1-based") int page,
            @JsonProperty("totalPages") @Schema(description = "0 when there are no items") int totalPages) {
    }
}
