package com.eclept.MessyNetBanking.common;

import java.math.BigInteger;
import java.util.regex.Pattern;

public final class Iban {

    private static final Pattern SHAPE = Pattern.compile("[A-Z]{2}\\d{2}[A-Z0-9]{11,30}");

    private Iban() {
    }

    public static boolean isValid(String iban) {
        if (iban == null) {
            return false;
        }
        String normalized = iban.replace(" ", "").toUpperCase();
        if (!SHAPE.matcher(normalized).matches()) {
            return false;
        }
        if (normalized.startsWith("RS") && normalized.length() != 22) {
            return false;
        }
        return mod97(normalized.substring(4) + normalized.substring(0, 4)) == 1;
    }

    /** Builds an IBAN with correct check digits, e.g. of("RS", "160000000012345678"). */
    public static String of(String country, String bban) {
        int check = 98 - mod97(bban + country + "00");
        return country + String.format("%02d", check) + bban;
    }

    private static int mod97(String rearranged) {
        StringBuilder digits = new StringBuilder();
        for (char c : rearranged.toCharArray()) {
            digits.append(Character.isLetter(c) ? String.valueOf(c - 'A' + 10) : String.valueOf(c));
        }
        return new BigInteger(digits.toString()).mod(BigInteger.valueOf(97)).intValue();
    }
}
