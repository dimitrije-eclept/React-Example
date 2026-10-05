package com.eclept.MessyNetBanking.common;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/** 422 body: {"errors": [{"fld": "amt", "msg": "..."}]} */
public record ValidationErrors(@JsonProperty("errors") List<FieldError> errors) {

    public record FieldError(@JsonProperty("fld") String fld, @JsonProperty("msg") String msg) {
    }

    public static ValidationErrors single(String fld, String msg) {
        return new ValidationErrors(List.of(new FieldError(fld, msg)));
    }
}
