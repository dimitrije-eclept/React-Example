package com.eclept.MessyNetBanking.transactions;

import java.math.BigDecimal;
import java.time.LocalDate;

/** amount is always positive; dc carries the sign. state B=booked, P=pending. */
public record Transaction(
        long seq,
        String txnRef,
        String accNo,
        LocalDate bookDate,
        LocalDate valDate,
        BigDecimal amount,
        String dc,
        String ccy,
        String partnerName,
        String partnerAcc,
        String purpose,
        String state) {

    public Transaction booked(LocalDate on) {
        return new Transaction(seq, txnRef, accNo, on, valDate.isBefore(on) ? on : valDate, amount, dc, ccy,
                partnerName, partnerAcc, purpose, "B");
    }
}
