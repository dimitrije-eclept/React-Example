package com.eclept.MessyNetBanking.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/** All the inconsistent wire formats in one place. */
public final class SerbianFormat {

    /** bookDate, query params dateFrom/dateTo: 14.09.2026 */
    public static final DateTimeFormatter DOTTED_DATE = DateTimeFormatter.ofPattern("dd.MM.uuuu")
            .withResolverStyle(ResolverStyle.STRICT);
    /** valDate: 20260915 */
    public static final DateTimeFormatter COMPACT_DATE = DateTimeFormatter.ofPattern("uuuuMMdd");
    /** stateDt: 02.10.2026 14:33 */
    public static final DateTimeFormatter DOTTED_DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.uuuu HH:mm");
    /** openDt: 2019-03-14T00:00:00 (no zone) */
    public static final DateTimeFormatter LOCAL_DATE_TIME = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss");

    private SerbianFormat() {
    }

    /** 1500.5 -> "1.500,50" */
    public static String amount(BigDecimal value) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols();
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        symbols.setMinusSign('-');
        DecimalFormat format = new DecimalFormat("#,##0.00", symbols);
        format.setRoundingMode(RoundingMode.HALF_UP);
        return format.format(value);
    }

    public static Optional<LocalDate> parseDottedDate(String value) {
        try {
            return Optional.of(LocalDate.parse(value, DOTTED_DATE));
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }

    public static String dotted(LocalDate date) {
        return DOTTED_DATE.format(date);
    }

    public static String compact(LocalDate date) {
        return COMPACT_DATE.format(date);
    }

    public static String dottedDateTime(Instant instant) {
        return DOTTED_DATE_TIME.format(instant.atZone(MockClock.ZONE));
    }

    public static String localDateTime(LocalDateTime dateTime) {
        return LOCAL_DATE_TIME.format(dateTime);
    }

    /** 2026-10-02T14:31:07+02:00 */
    public static String offsetDateTime(Instant instant) {
        return instant.truncatedTo(ChronoUnit.SECONDS).atZone(MockClock.ZONE).toOffsetDateTime().toString();
    }
}
