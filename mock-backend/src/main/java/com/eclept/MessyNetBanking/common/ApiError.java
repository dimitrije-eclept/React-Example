package com.eclept.MessyNetBanking.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/** {"code": "...", "message"?: "...", "attemptsLeft"?: n}: the "code style" error body. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        @JsonProperty("code") String code,
        @JsonProperty("message") String message,
        @JsonProperty("attemptsLeft") Integer attemptsLeft) {

    public static ApiError of(String code) {
        return new ApiError(code, null, null);
    }
}
