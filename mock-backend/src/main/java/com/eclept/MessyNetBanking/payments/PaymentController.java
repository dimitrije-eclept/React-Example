package com.eclept.MessyNetBanking.payments;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.eclept.MessyNetBanking.common.ApiError;
import com.eclept.MessyNetBanking.common.BusinessError;
import com.eclept.MessyNetBanking.common.ValidationErrors;
import com.eclept.MessyNetBanking.payments.PaymentDtos.DomesticInitRequest;
import com.eclept.MessyNetBanking.payments.PaymentDtos.DomesticInitResponse;
import com.eclept.MessyNetBanking.payments.PaymentDtos.PaymentStatus;
import com.eclept.MessyNetBanking.payments.PaymentDtos.SignRequest;
import com.eclept.MessyNetBanking.payments.PaymentDtos.SignResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@Tag(name = "payments", description = "Domestic payment: init -> sign (SMS OTP) -> poll stat.")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    @PostMapping("/pay/dom/init")
    @Operation(summary = "Create a domestic payment",
            description = "`amount` is a JSON **number** here (the internal transfer takes a string). Response flags "
                    + "are \"Y\"/\"N\" strings. Creditor IBAN must pass mod-97, else 422 on `creditorIban`. Funds are "
                    + "NOT checked here (see /sign). Only RSD. Payments to " + PaymentService.REJECT_IBAN
                    + " end in REJ.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = DomesticInitResponse.class)))
    @ApiResponse(responseCode = "404", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "422", content = @Content(schema = @Schema(implementation = ValidationErrors.class)))
    public DomesticInitResponse init(@Valid @RequestBody DomesticInitRequest request) {
        return service.init(request);
    }

    @PostMapping("/pay/dom/{ref}/sign")
    @Operation(summary = "Sign with OTP",
            description = "OTP 123456. Wrong OTP: 403 OTP_INVALID+attemptsLeft, 3rd failure 403 OTP_LOCKED and the "
                    + "payment becomes CANC. Insufficient funds is detected **here**, returned as **HTTP 200** "
                    + "{status:\"ERROR\", errCode:\"ERR_FUNDS\"} (no errMsg) and the payment becomes REJ. "
                    + "Signing a non-INIT payment: 409 {code:\"PAY_STATE\", message:<state>}.")
    @ApiResponse(responseCode = "200", description = "Signed OR business error",
            content = @Content(schema = @Schema(oneOf = {SignResponse.class, BusinessError.class})))
    @ApiResponse(responseCode = "403", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "404", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public ResponseEntity<Object> sign(@PathVariable String ref, @Valid @RequestBody SignRequest request) {
        return ResponseEntity.ok(service.sign(ref, request.otp()));
    }

    @GetMapping("/pay/dom/{ref}/stat")
    @Operation(summary = "Payment status",
            description = "Poll this. PEND becomes EXEC (or REJ for the reject IBAN) after "
                    + "messy.payments.execution-delay-seconds (default 10). `stateDt` is `dd.MM.yyyy HH:mm` with no "
                    + "zone (Europe/Belgrade). Unknown ref: 404 PAY_NOT_FOUND.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = PaymentStatus.class)))
    @ApiResponse(responseCode = "404", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public PaymentStatus stat(@PathVariable String ref) {
        return service.status(ref);
    }
}
