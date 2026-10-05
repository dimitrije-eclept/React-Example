package com.eclept.MessyNetBanking.payments;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;

@Repository
public class PaymentRepository {

    private final Map<String, DomesticPayment> payments = new ConcurrentHashMap<>();

    public void save(DomesticPayment payment) {
        payments.put(payment.ref, payment);
    }

    public Optional<DomesticPayment> find(String ref) {
        return Optional.ofNullable(payments.get(ref));
    }

    public Collection<DomesticPayment> findAll() {
        return payments.values();
    }

    public void clear() {
        payments.clear();
    }
}
