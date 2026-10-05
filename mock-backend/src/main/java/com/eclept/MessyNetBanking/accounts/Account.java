package com.eclept.MessyNetBanking.accounts;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Mutable account. Balance changes go through {@link AccountRepository#withLocks} so two-account
 * operations lock in a stable order.
 */
public class Account {

    private final int seq;
    private final String accNo;
    private final String iban;
    private final String descr;
    private final String prodType;
    private final String ccy;
    private final String status;
    private final LocalDateTime openDt;
    private BigDecimal available;
    private BigDecimal booked;

    public Account(int seq, String accNo, String iban, String descr, String prodType, String ccy, String status,
            LocalDateTime openDt, BigDecimal available, BigDecimal booked) {
        this.seq = seq;
        this.accNo = accNo;
        this.iban = iban;
        this.descr = descr;
        this.prodType = prodType;
        this.ccy = ccy;
        this.status = status;
        this.openDt = openDt;
        this.available = available;
        this.booked = booked;
    }

    public int seq() {
        return seq;
    }

    public String accNo() {
        return accNo;
    }

    public String iban() {
        return iban;
    }

    public String descr() {
        return descr;
    }

    public String prodType() {
        return prodType;
    }

    public String ccy() {
        return ccy;
    }

    public String status() {
        return status;
    }

    public LocalDateTime openDt() {
        return openDt;
    }

    public synchronized BigDecimal available() {
        return available;
    }

    public synchronized BigDecimal booked() {
        return booked;
    }

    /** Booked debit: both balances drop. */
    public synchronized void debit(BigDecimal amount) {
        available = available.subtract(amount);
        booked = booked.subtract(amount);
    }

    public synchronized void credit(BigDecimal amount) {
        available = available.add(amount);
        booked = booked.add(amount);
    }

    /** Pending debit: only available drops. */
    public synchronized void reserve(BigDecimal amount) {
        available = available.subtract(amount);
    }

    public synchronized void release(BigDecimal amount) {
        available = available.add(amount);
    }

    /** A reserved amount gets booked. */
    public synchronized void bookReserved(BigDecimal amount) {
        booked = booked.subtract(amount);
    }
}
