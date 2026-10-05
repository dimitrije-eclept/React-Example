package com.eclept.MessyNetBanking.common;

import java.lang.reflect.RecordComponent;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindingResult;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.fasterxml.jackson.annotation.JsonProperty;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Object> api(ApiException ex) {
        return ResponseEntity.status(ex.status()).body(ex.body());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ValidationErrors> invalidBody(MethodArgumentNotValidException ex) {
        BindingResult result = ex.getBindingResult();
        Class<?> target = result.getTarget() != null ? result.getTarget().getClass() : null;
        List<ValidationErrors.FieldError> errors = result.getFieldErrors().stream()
                .map(e -> new ValidationErrors.FieldError(jsonName(target, e.getField()), e.getDefaultMessage()))
                .toList();
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT).body(new ValidationErrors(errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ValidationErrors> unreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT)
                .body(ValidationErrors.single("body", "Neispravan format zahteva"));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ValidationErrors> missingParam(MissingServletRequestParameterException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT)
                .body(ValidationErrors.single(ex.getParameterName(), "Obavezan parametar"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ValidationErrors> badParam(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT)
                .body(ValidationErrors.single(ex.getName(), "Neispravna vrednost"));
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    ResponseEntity<?> missingHeader(MissingRequestHeaderException ex) {
        if ("Idempotency-Key".equalsIgnoreCase(ex.getHeaderName())) {
            return ResponseEntity.badRequest().body(ApiError.of("IDEMPOTENCY_KEY_MISSING"));
        }
        return Html.response(HttpStatus.BAD_REQUEST, "Bad Request");
    }

    /** Anything else: framework errors keep their status, real bugs become a 500 HTML page. */
    @ExceptionHandler(Exception.class)
    ResponseEntity<String> fallback(Exception ex) {
        if (ex instanceof ErrorResponse errorResponse) {
            HttpStatusCode status = errorResponse.getStatusCode();
            HttpStatus resolved = HttpStatus.resolve(status.value());
            return Html.response(status, resolved != null ? resolved.getReasonPhrase() : "Error");
        }
        log.error("Unhandled exception", ex);
        return Html.response(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error");
    }

    /** Report the JSON field name, not the Java one (refresh_token, not refreshToken). */
    private static String jsonName(Class<?> type, String field) {
        if (type != null && type.isRecord()) {
            for (RecordComponent component : type.getRecordComponents()) {
                JsonProperty property = component.getAnnotation(JsonProperty.class);
                if (component.getName().equals(field) && property != null && !property.value().isEmpty()) {
                    return property.value();
                }
            }
        }
        return field;
    }
}
