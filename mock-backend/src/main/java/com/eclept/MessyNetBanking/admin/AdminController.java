package com.eclept.MessyNetBanking.admin;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eclept.MessyNetBanking.accounts.AccountRepository;
import com.eclept.MessyNetBanking.auth.SessionStore;
import com.eclept.MessyNetBanking.common.ApiException;
import com.eclept.MessyNetBanking.common.MockClock;
import com.eclept.MessyNetBanking.common.SeedData;
import com.eclept.MessyNetBanking.payments.DomesticPayment;
import com.eclept.MessyNetBanking.payments.PaymentRepository;
import com.eclept.MessyNetBanking.payments.PaymentService;
import com.eclept.MessyNetBanking.transactions.TransactionRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Dev-only test hooks. No auth. Clean JSON on purpose: this is tooling, not the legacy API. */
@Profile("dev")
@RestController
@RequestMapping("/__admin")
@SecurityRequirements
@Tag(name = "admin", description = "Dev profile only. Not part of the legacy API.")
public class AdminController {

    private final SeedData seed;
    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final PaymentRepository payments;
    private final PaymentService paymentService;
    private final SessionStore sessions;
    private final MockClock clock;

    public AdminController(SeedData seed, AccountRepository accounts, TransactionRepository transactions,
            PaymentRepository payments, PaymentService paymentService, SessionStore sessions, MockClock clock) {
        this.seed = seed;
        this.accounts = accounts;
        this.transactions = transactions;
        this.payments = payments;
        this.paymentService = paymentService;
        this.sessions = sessions;
        this.clock = clock;
    }

    @PostMapping("/reset")
    @Operation(summary = "Restore seed data and invalidate all tokens")
    public Map<String, Object> reset() {
        seed.reset();
        return Map.of("reset", true);
    }

    @GetMapping("/state")
    @Operation(summary = "Dump balances, pending payments and session count")
    public Map<String, Object> state() {
        paymentService.advanceAll();
        List<Map<String, Object>> balances = accounts.findAll().stream().map(a -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("accNo", a.accNo());
            row.put("ccy", a.ccy());
            row.put("available", a.available());
            row.put("booked", a.booked());
            return row;
        }).toList();
        List<Map<String, Object>> pending = payments.findAll().stream()
                .filter(p -> p.state() == DomesticPayment.State.INIT || p.state() == DomesticPayment.State.PEND)
                .map(p -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("paymentRef", p.ref());
                    row.put("state", p.state().name());
                    row.put("debtorAcc", p.debtorAcc());
                    row.put("amount", p.amount());
                    row.put("executesAt", p.signedAt() == null ? null : p.signedAt().plus(paymentService.executionDelay()).toString());
                    return row;
                }).toList();
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("balances", balances);
        state.put("pendingPayments", pending);
        state.put("activeSessions", sessions.activeSessionCount());
        state.put("transactionCount", transactions.count());
        state.put("clockOffsetSeconds", clock.offsetSeconds());
        state.put("now", clock.now().toString());
        return state;
    }

    @PostMapping("/time-travel")
    @Operation(summary = "Fast-forward the payment clock by N seconds")
    public Map<String, Object> timeTravel(@RequestParam long seconds) {
        if (seconds < 0) {
            throw ApiException.validation("seconds", "Only forward");
        }
        clock.advance(Duration.ofSeconds(seconds));
        paymentService.advanceAll();
        return Map.of("clockOffsetSeconds", clock.offsetSeconds(), "now", clock.now().toString());
    }

    @GetMapping("/boom")
    @Operation(summary = "Throws, to demo the HTML 500 page")
    public Map<String, Object> boom() {
        throw new IllegalStateException("Deliberate failure from /__admin/boom");
    }
}
