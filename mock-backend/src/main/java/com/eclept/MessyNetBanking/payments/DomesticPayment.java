package com.eclept.MessyNetBanking.payments;

import java.math.BigDecimal;
import java.time.Instant;

import com.eclept.MessyNetBanking.common.OtpAttempts;

/** Mutable payment; all access synchronized on the instance. */
public class DomesticPayment {

    public enum State { INIT, PEND, EXEC, REJ, CANC }

    final String ref;
    final String debtorAcc;
    final String creditorIban;
    final String creditorName;
    final BigDecimal amount;
    final String currency;
    final String purposeCode;
    final String reference;
    final String description;
    final OtpAttempts otp = new OtpAttempts();
    State state = State.INIT;
    Instant stateAt;
    Instant signedAt;
    String txnRef;

    DomesticPayment(String ref, String debtorAcc, String creditorIban, String creditorName, BigDecimal amount,
            String currency, String purposeCode, String reference, String description, Instant createdAt) {
        this.ref = ref;
        this.debtorAcc = debtorAcc;
        this.creditorIban = creditorIban;
        this.creditorName = creditorName;
        this.amount = amount;
        this.currency = currency;
        this.purposeCode = purposeCode;
        this.reference = reference;
        this.description = description;
        this.stateAt = createdAt;
    }

    void transition(State next, Instant at) {
        state = next;
        stateAt = at;
    }

    public synchronized String ref() {
        return ref;
    }

    public synchronized State state() {
        return state;
    }

    public synchronized BigDecimal amount() {
        return amount;
    }

    public synchronized Instant signedAt() {
        return signedAt;
    }

    public synchronized String debtorAcc() {
        return debtorAcc;
    }
}
