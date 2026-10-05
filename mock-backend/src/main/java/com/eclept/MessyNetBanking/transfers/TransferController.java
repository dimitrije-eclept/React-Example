package com.eclept.MessyNetBanking.transfers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.eclept.MessyNetBanking.auth.BearerAuthInterceptor;
import com.eclept.MessyNetBanking.common.ApiError;
import com.eclept.MessyNetBanking.common.ApiException;
import com.eclept.MessyNetBanking.common.BusinessError;
import com.eclept.MessyNetBanking.common.ValidationErrors;
import com.eclept.MessyNetBanking.transfers.TransferDtos.InternalTransferRequest;
import com.eclept.MessyNetBanking.transfers.TransferDtos.TransferOk;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@Tag(name = "transfers")
public class TransferController {

    private final TransferService service;
    private final IdempotencyStore idempotency;

    public TransferController(TransferService service, IdempotencyStore idempotency) {
        this.service = service;
        this.idempotency = idempotency;
    }

    @PostMapping("/pay/internal/exec")
    @Operation(summary = "Transfer between own accounts",
            description = "Request `amt` is a string with a **dot** decimal (\"1500.50\"); responses elsewhere use "
                    + "\"1.500,50\". Business failures come back as **HTTP 200** with "
                    + "{status:\"ERROR\", errCode}: ERR_FUNDS (has errMsg) or ERR_CCY (no errMsg). "
                    + "Idempotency-Key header is required (400 IDEMPOTENCY_KEY_MISSING); a repeated key returns the "
                    + "original response, including an original ERROR, without moving money again.")
    @ApiResponse(responseCode = "200", description = "Success OR business error",
            content = @Content(schema = @Schema(oneOf = {TransferOk.class, BusinessError.class})))
    @ApiResponse(responseCode = "400", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "404", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "422", content = @Content(schema = @Schema(implementation = ValidationErrors.class)))
    public ResponseEntity<Object> exec(
            @Parameter(required = true) @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestAttribute(BearerAuthInterceptor.USER_ATTR) String user,
            @Valid @RequestBody InternalTransferRequest request) {
        if (idempotencyKey.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ApiError.of("IDEMPOTENCY_KEY_MISSING"));
        }
        return ResponseEntity.ok(idempotency.once(user, idempotencyKey, () -> service.execute(request)));
    }
}
