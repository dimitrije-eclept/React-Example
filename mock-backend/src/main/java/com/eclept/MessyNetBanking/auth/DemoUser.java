package com.eclept.MessyNetBanking.auth;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Component;

/** The single seeded user. */
@Component
public class DemoUser {

    public static final String USERNAME = "demo";
    public static final String PASSWORD = "demo123";
    public static final String FIRST_NAME = "Marko";
    public static final String LAST_NAME = "Petrović";
    public static final String EMAIL = "marko.petrovic@example.rs";
    public static final String PHONE = "+381 64 123 4567";
    public static final String MASKED_PHONE = "+381 64 *** **67";

    private final AtomicLong lastLoginEpochSeconds = new AtomicLong();

    public DemoUser() {
        reset();
    }

    public boolean matches(String username, String password) {
        return USERNAME.equals(username) && PASSWORD.equals(password);
    }

    public long lastLoginEpochSeconds() {
        return lastLoginEpochSeconds.get();
    }

    public void recordLogin(Instant at) {
        lastLoginEpochSeconds.set(at.getEpochSecond());
    }

    public void reset() {
        lastLoginEpochSeconds.set(Instant.now().minusSeconds(26 * 3600).getEpochSecond());
    }
}
