package com.eclept.MessyNetBanking.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;

/** The "200 OK but actually failed" body. */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Business error returned with HTTP 200. errMsg is only present for some errCodes.")
public record BusinessError(
        @JsonProperty("status") @Schema(allowableValues = "ERROR") String status,
        @JsonProperty("errCode") @Schema(allowableValues = {"ERR_FUNDS", "ERR_CCY"}) String errCode,
        @JsonProperty("errMsg") @Schema(nullable = true) String errMsg) {

    public static BusinessError of(String errCode, String errMsg) {
        return new BusinessError("ERROR", errCode, errMsg);
    }
}
