package com.eclept.MessyNetBanking.auth;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.eclept.MessyNetBanking.auth.AuthDtos.LoginRequest;
import com.eclept.MessyNetBanking.auth.AuthDtos.LoginResponse;
import com.eclept.MessyNetBanking.auth.AuthDtos.OAuthError;
import com.eclept.MessyNetBanking.auth.AuthDtos.OtpRequest;
import com.eclept.MessyNetBanking.auth.AuthDtos.RefreshRequest;
import com.eclept.MessyNetBanking.auth.AuthDtos.TokenResponse;
import com.eclept.MessyNetBanking.common.ApiError;
import com.eclept.MessyNetBanking.common.ApiException;
import com.eclept.MessyNetBanking.common.ValidationErrors;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@Tag(name = "auth", description = "Two-step login: password, then SMS OTP.")
public class AuthController {

    private final SessionStore sessions;
    private final DemoUser user;

    public AuthController(SessionStore sessions, DemoUser user) {
        this.sessions = sessions;
        this.user = user;
    }

    @PostMapping("/auth/login")
    @SecurityRequirements
    @Operation(summary = "Step 1: username + password",
            description = "Returns a login ticket, never tokens. `otpRequired` is a JSON boolean here, while the rest "
                    + "of the API uses \"Y\"/\"N\" strings. Wrong credentials: 401 with a JSON body (unlike the empty "
                    + "401 for a bad token).")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = LoginResponse.class)))
    @ApiResponse(responseCode = "401", description = "AUTH_FAILED, message in Serbian",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "422", content = @Content(schema = @Schema(implementation = ValidationErrors.class)))
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        if (!user.matches(request.username(), request.password())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, new ApiError("AUTH_FAILED", "Neispravni podaci", null));
        }
        SessionStore.LoginTicket ticket = sessions.newTicket(request.username());
        return new LoginResponse(ticket.id, true, "SMS", DemoUser.MASKED_PHONE);
    }

    @PostMapping("/auth/otp")
    @SecurityRequirements
    @Operation(summary = "Step 2: OTP for the ticket",
            description = "Request field is `ticket` (response of step 1 called it `loginTicket`). Response is "
                    + "**snake_case**. OTP is always 123456. Wrong OTP: 403 OTP_INVALID with attemptsLeft; the 3rd "
                    + "failure returns OTP_LOCKED and kills the ticket. Unknown/expired/dead ticket: 403 TICKET_INVALID.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = TokenResponse.class)))
    @ApiResponse(responseCode = "403", description = "OTP_INVALID (+attemptsLeft) | OTP_LOCKED | TICKET_INVALID",
            content = @Content(schema = @Schema(implementation = ApiError.class)))
    public TokenResponse otp(@Valid @RequestBody OtpRequest request) {
        SessionStore.LoginTicket ticket = sessions.ticket(request.ticket())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, ApiError.of("TICKET_INVALID")));
        synchronized (ticket) {
            if (sessions.ticket(ticket.id).isEmpty()) {
                throw new ApiException(HttpStatus.FORBIDDEN, ApiError.of("TICKET_INVALID"));
            }
            try {
                ticket.otp.verify(request.otp());
            } catch (ApiException e) {
                if (ticket.otp.locked()) {
                    sessions.killTicket(ticket.id);
                }
                throw e;
            }
            sessions.killTicket(ticket.id);
        }
        user.recordLogin(Instant.now());
        return toResponse(sessions.issue(ticket.username));
    }

    @PostMapping("/auth/refresh")
    @SecurityRequirements
    @Operation(summary = "Rotate tokens",
            description = "Body field is `refresh_token` (snake_case). Rotates: the presented refresh token is "
                    + "invalid afterwards. Invalid/used/expired refresh token: **400 {\"error\":\"invalid_grant\"}**, "
                    + "a third error shape.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = TokenResponse.class)))
    @ApiResponse(responseCode = "400", content = @Content(schema = @Schema(implementation = OAuthError.class)))
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshRequest request) {
        return sessions.rotate(request.refreshToken())
                .<ResponseEntity<?>>map(tokens -> ResponseEntity.ok(toResponse(tokens)))
                .orElseGet(() -> ResponseEntity.badRequest().body(new OAuthError("invalid_grant")));
    }

    @PostMapping("/auth/logout")
    @Operation(summary = "Logout", description = "No body. Invalidates the access token and its refresh token.")
    @ApiResponse(responseCode = "204", description = "No content")
    public ResponseEntity<Void> logout(@RequestAttribute(BearerAuthInterceptor.TOKEN_ATTR) String token) {
        sessions.logout(token);
        return ResponseEntity.noContent().build();
    }

    private static TokenResponse toResponse(SessionStore.IssuedTokens tokens) {
        return new TokenResponse(tokens.accessToken(), tokens.refreshToken(), tokens.expiresIn(), "bearer");
    }
}
