package com.eclept.MessyNetBanking.cards;

import java.math.BigDecimal;

/** blocked is "Y"/"N" on the wire; kept as a boolean here. */
public record Card(int seq, String pan, String expiry, String type, String linkedAcc, boolean blocked, BigDecimal limit) {

    public Card withBlocked(boolean value) {
        return new Card(seq, pan, expiry, type, linkedAcc, value, limit);
    }
}
