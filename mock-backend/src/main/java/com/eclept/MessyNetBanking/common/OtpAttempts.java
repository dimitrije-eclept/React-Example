package com.eclept.MessyNetBanking.common;

import org.springframework.http.HttpStatus;

/** Shared OTP rule for login and payment signing: 3 wrong codes and it's locked. Not thread-safe; guard externally. */
public class OtpAttempts {

    public static final String VALID_OTP = "123456";
    public static final int MAX_FAILURES = 3;

    private int failures;
    private boolean locked;

    /**
     * Returns normally on the right code. Throws 403 OTP_INVALID (with attemptsLeft) or,
     * on the last allowed failure, 403 OTP_LOCKED. Caller must kill the ticket/payment when {@link #locked()}.
     */
    public void verify(String otp) {
        if (locked) {
            throw new ApiException(HttpStatus.FORBIDDEN, ApiError.of("OTP_LOCKED"));
        }
        if (VALID_OTP.equals(otp)) {
            return;
        }
        failures++;
        if (failures >= MAX_FAILURES) {
            locked = true;
            throw new ApiException(HttpStatus.FORBIDDEN, ApiError.of("OTP_LOCKED"));
        }
        throw new ApiException(HttpStatus.FORBIDDEN, new ApiError("OTP_INVALID", null, MAX_FAILURES - failures));
    }

    public boolean locked() {
        return locked;
    }
}
