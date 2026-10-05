package com.eclept.MessyNetBanking.payments;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.eclept.MessyNetBanking.accounts.Account;
import com.eclept.MessyNetBanking.accounts.AccountRepository;
import com.eclept.MessyNetBanking.auth.DemoUser;
import com.eclept.MessyNetBanking.common.ApiError;
import com.eclept.MessyNetBanking.common.ApiException;
import com.eclept.MessyNetBanking.common.BusinessError;
import com.eclept.MessyNetBanking.common.Iban;
import com.eclept.MessyNetBanking.common.MessyProperties;
import com.eclept.MessyNetBanking.common.MockClock;
import com.eclept.MessyNetBanking.common.SerbianFormat;
import com.eclept.MessyNetBanking.payments.DomesticPayment.State;
import com.eclept.MessyNetBanking.payments.PaymentDtos.DomesticInitRequest;
import com.eclept.MessyNetBanking.payments.PaymentDtos.DomesticInitResponse;
import com.eclept.MessyNetBanking.payments.PaymentDtos.PaymentStatus;
import com.eclept.MessyNetBanking.payments.PaymentDtos.SignResponse;
import com.eclept.MessyNetBanking.transactions.TransactionRepository;

@Service
public class PaymentService {

    /** Payments to this (valid) IBAN are rejected by the "clearing house" after signing. */
    public static final String REJECT_IBAN = "RS81999000000000000099";

    private final PaymentRepository payments;
    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final MockClock clock;
    private final Duration executionDelay;
    private final AtomicLong sequence = new AtomicLong();

    public PaymentService(PaymentRepository payments, AccountRepository accounts, TransactionRepository transactions,
            MockClock clock, MessyProperties properties) {
        this.payments = payments;
        this.accounts = accounts;
        this.transactions = transactions;
        this.clock = clock;
        this.executionDelay = Duration.ofSeconds(properties.payments().executionDelaySeconds());
    }

    public DomesticInitResponse init(DomesticInitRequest request) {
        String iban = request.creditorIban().replace(" ", "").toUpperCase();
        if (!Iban.isValid(iban)) {
            throw ApiException.validation("creditorIban", "Neispravan IBAN primaoca");
        }
        Account debtor = accounts.find(request.debtorAcc()).orElseThrow(ApiException::accountNotFound);
        if (!"RSD".equals(request.currency()) || !"RSD".equals(debtor.ccy())) {
            throw ApiException.validation("currency", "Domaće plaćanje je moguće samo u RSD");
        }
        Instant now = clock.now();
        String ref = "DOM-" + SerbianFormat.compact(clock.today()) + "-" + String.format("%06d", sequence.incrementAndGet());
        payments.save(new DomesticPayment(ref, debtor.accNo(), iban, request.creditorName(), request.amount(),
                request.currency(), request.purposeCode(), request.reference(), request.description(), now));
        return new DomesticInitResponse(ref, "Y", "SMS_OTP", DemoUser.MASKED_PHONE);
    }

    /** Returns {@link SignResponse} or a 200-style {@link BusinessError}. */
    public Object sign(String ref, String otp) {
        DomesticPayment payment = find(ref);
        Account debtor = accounts.find(payment.debtorAcc).orElseThrow(ApiException::accountNotFound);
        synchronized (debtor) {
            synchronized (payment) {
                if (payment.state != State.INIT) {
                    throw new ApiException(HttpStatus.CONFLICT, new ApiError("PAY_STATE", payment.state.name(), null));
                }
                try {
                    payment.otp.verify(otp);
                } catch (ApiException e) {
                    if (payment.otp.locked()) {
                        payment.transition(State.CANC, clock.now());
                    }
                    throw e;
                }
                if (debtor.available().compareTo(payment.amount) < 0) {
                    payment.transition(State.REJ, clock.now());
                    return BusinessError.of("ERR_FUNDS", null);
                }
                Instant now = clock.now();
                LocalDate today = clock.today();
                debtor.reserve(payment.amount);
                payment.txnRef = transactions.add(debtor.accNo(), today, today.plusDays(1), payment.amount, "D",
                        debtor.ccy(), payment.creditorName, payment.creditorIban, payment.description, "P").txnRef();
                payment.signedAt = now;
                payment.transition(State.PEND, now);
                return new SignResponse(payment.ref, State.PEND.name());
            }
        }
    }

    public PaymentStatus status(String ref) {
        DomesticPayment payment = find(ref);
        advance(payment);
        synchronized (payment) {
            return new PaymentStatus(payment.ref, payment.state.name(), SerbianFormat.dottedDateTime(payment.stateAt));
        }
    }

    /** Background sweep so balances settle even if nobody polls /stat. */
    @Scheduled(fixedDelay = 1000)
    public void advanceAll() {
        payments.findAll().forEach(this::advance);
    }

    /** PEND -> EXEC (book the reservation) or REJ (release it) once the execution delay has passed. */
    void advance(DomesticPayment payment) {
        Account debtor = accounts.find(payment.debtorAcc()).orElse(null);
        if (debtor == null) {
            return;
        }
        synchronized (debtor) {
            synchronized (payment) {
                if (payment.state != State.PEND || clock.now().isBefore(payment.signedAt.plus(executionDelay))) {
                    return;
                }
                Instant executedAt = payment.signedAt.plus(executionDelay);
                if (REJECT_IBAN.equals(payment.creditorIban)) {
                    debtor.release(payment.amount);
                    transactions.remove(payment.txnRef);
                    payment.transition(State.REJ, executedAt);
                } else {
                    debtor.bookReserved(payment.amount);
                    transactions.find(payment.txnRef)
                            .ifPresent(t -> transactions.replace(t.booked(LocalDate.ofInstant(executedAt, MockClock.ZONE))));
                    payment.transition(State.EXEC, executedAt);
                }
            }
        }
    }

    public Duration executionDelay() {
        return executionDelay;
    }

    private DomesticPayment find(String ref) {
        return payments.find(ref).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ApiError.of("PAY_NOT_FOUND")));
    }
}
