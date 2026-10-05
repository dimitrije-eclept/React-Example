package com.eclept.MessyNetBanking.transactions;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Repository;

import com.eclept.MessyNetBanking.common.SerbianFormat;

@Repository
public class TransactionRepository {

    private static final Comparator<Transaction> NEWEST_FIRST = Comparator
            .comparing(Transaction::bookDate).reversed()
            .thenComparing(Comparator.comparingLong(Transaction::seq).reversed());

    private final Map<String, Transaction> transactions = new ConcurrentHashMap<>();
    private final AtomicLong sequence = new AtomicLong();

    /** Creates and stores a transaction with a fresh "TX20260914-000123" style reference. */
    public Transaction add(String accNo, LocalDate bookDate, LocalDate valDate, BigDecimal amount, String dc,
            String ccy, String partnerName, String partnerAcc, String purpose, String state) {
        long seq = sequence.incrementAndGet();
        String ref = "TX" + SerbianFormat.compact(bookDate) + "-" + String.format("%06d", seq);
        Transaction txn = new Transaction(seq, ref, accNo, bookDate, valDate, amount, dc, ccy, partnerName,
                partnerAcc, purpose, state);
        transactions.put(ref, txn);
        return txn;
    }

    public Optional<Transaction> find(String txnRef) {
        return Optional.ofNullable(transactions.get(txnRef));
    }

    public void replace(Transaction txn) {
        transactions.put(txn.txnRef(), txn);
    }

    public void remove(String txnRef) {
        transactions.remove(txnRef);
    }

    public List<Transaction> forAccount(String accNo) {
        return transactions.values().stream()
                .filter(t -> t.accNo().equals(accNo))
                .sorted(NEWEST_FIRST)
                .toList();
    }

    public int count() {
        return transactions.size();
    }

    public void clear() {
        transactions.clear();
        sequence.set(0);
    }
}
