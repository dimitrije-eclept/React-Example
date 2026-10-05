package com.eclept.MessyNetBanking.common;

import org.springframework.http.HttpStatus;

/** Short-circuits a request with a given status and JSON body. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final Object body;

    public ApiException(HttpStatus status, Object body) {
        super(status + " " + body);
        this.status = status;
        this.body = body;
    }

    public static ApiException accountNotFound() {
        return new ApiException(HttpStatus.NOT_FOUND, ApiError.of("ACC_NOT_FOUND"));
    }

    public static ApiException validation(String fld, String msg) {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, ValidationErrors.single(fld, msg));
    }

    public HttpStatus status() {
        return status;
    }

    public Object body() {
        return body;
    }
}
