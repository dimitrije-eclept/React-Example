package com.eclept.MessyNetBanking.common;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Component;

/**
 * Wall clock plus an offset that {@code /__admin/time-travel} can push forward.
 * Drives payment execution and booking dates. Token expiry deliberately uses real time.
 */
@Component
public class MockClock {

    public static final ZoneId ZONE = ZoneId.of("Europe/Belgrade");

    private final AtomicLong offsetMillis = new AtomicLong();

    public Instant now() {
        return Instant.now().plusMillis(offsetMillis.get());
    }

    public LocalDate today() {
        return LocalDate.ofInstant(now(), ZONE);
    }

    public void advance(Duration duration) {
        offsetMillis.addAndGet(duration.toMillis());
    }

    public long offsetSeconds() {
        return offsetMillis.get() / 1000;
    }

    public void reset() {
        offsetMillis.set(0);
    }
}
