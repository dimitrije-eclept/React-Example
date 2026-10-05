package com.eclept.MessyNetBanking.common;

import java.security.SecureRandom;
import java.util.Base64;

public final class Ids {

    private static final SecureRandom RANDOM = new SecureRandom();

    private Ids() {
    }

    /** Opaque, URL-safe random token. */
    public static String opaque(int bytes) {
        byte[] buffer = new byte[bytes];
        RANDOM.nextBytes(buffer);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
    }
}
