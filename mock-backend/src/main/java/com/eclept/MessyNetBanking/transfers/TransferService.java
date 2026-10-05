package com.eclept.MessyNetBanking.transfers;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Service;

import com.eclept.MessyNetBanking.accounts.Account;
import com.eclept.MessyNetBanking.accounts.AccountRepository;
import com.eclept.MessyNetBanking.common.ApiException;
import com.eclept.MessyNetBanking.common.BusinessError;
import com.eclept.MessyNetBanking.common.MockClock;
import com.eclept.MessyNetBanking.common.SerbianFormat;
import com.eclept.MessyNetBanking.transactions.TransactionRepository;
import com.eclept.MessyNetBanking.transfers.TransferDtos.InternalTransferRequest;
import com.eclept.MessyNetBanking.transfers.TransferDtos.TransferOk;

@Service
public class TransferService {

    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final MockClock clock;
    private final AtomicLong sequence = new AtomicLong();

    public TransferService(AccountRepository accounts, TransactionRepository transactions, MockClock clock) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.clock = clock;
    }

    /** Returns either {@link TransferOk} or a 200-style {@link BusinessError}. */
    public Object execute(InternalTransferRequest request) {
        BigDecimal amount = new BigDecimal(request.amt());
        if (amount.signum() <= 0) {
            throw ApiException.validation("amt", "Iznos mora biti veći od nule");
        }
        if (request.srcAcc().equals(request.dstAcc())) {
            throw ApiException.validation("dstAcc", "Račun primaoca mora biti različit od računa platioca");
        }
        Account src = accounts.find(request.srcAcc()).orElseThrow(ApiException::accountNotFound);
        Account dst = accounts.find(request.dstAcc()).orElseThrow(ApiException::accountNotFound);

        if (!src.ccy().equals(dst.ccy()) || !src.ccy().equals(request.ccy())) {
            return BusinessError.of("ERR_CCY", null);
        }

        return AccountRepository.withLocks(src, dst, () -> {
            if (src.available().compareTo(amount) < 0) {
                return BusinessError.of("ERR_FUNDS", "Nedovoljno sredstava");
            }
            Instant now = clock.now();
            LocalDate today = clock.today();
            src.debit(amount);
            dst.credit(amount);
            String purpose = request.descr() == null || request.descr().isBlank() ? null : request.descr();
            transactions.add(src.accNo(), today, today, amount, "D", src.ccy(), "Prenos na sopstveni račun",
                    dst.accNo(), purpose, "B");
            transactions.add(dst.accNo(), today, today, amount, "C", dst.ccy(), "Prenos sa sopstvenog računa",
                    src.accNo(), purpose, "B");
            String ref = "INT-" + SerbianFormat.compact(today) + "-" + String.format("%06d", sequence.incrementAndGet());
            return new TransferOk(ref, SerbianFormat.offsetDateTime(now));
        });
    }
}
