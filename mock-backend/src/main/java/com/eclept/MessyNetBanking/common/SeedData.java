package com.eclept.MessyNetBanking.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

import com.eclept.MessyNetBanking.accounts.Account;
import com.eclept.MessyNetBanking.accounts.AccountRepository;
import com.eclept.MessyNetBanking.auth.DemoUser;
import com.eclept.MessyNetBanking.auth.SessionStore;
import com.eclept.MessyNetBanking.cards.Card;
import com.eclept.MessyNetBanking.cards.CardRepository;
import com.eclept.MessyNetBanking.payments.PaymentRepository;
import com.eclept.MessyNetBanking.transactions.TransactionRepository;
import com.eclept.MessyNetBanking.transfers.IdempotencyStore;

/**
 * Deterministic seed: fixed Random seed, so amounts, counterparties and day offsets are identical every run.
 * Dates are relative to "today" so the history always covers the last 6 months.
 */
@Component
public class SeedData implements InitializingBean {

    public static final String CURRENT = "160-0000000123456-78";
    public static final String SAVINGS = "160-0000000987654-32";
    public static final String CARD = "160-0000000555555-11";

    public static final BigDecimal CURRENT_AVAILABLE = new BigDecimal("185000.00");
    public static final BigDecimal SAVINGS_AVAILABLE = new BigDecimal("4200.00");
    public static final BigDecimal CARD_AVAILABLE = new BigDecimal("22500.00");

    private static final long RANDOM_SEED = 20261002L;

    /** The 3 most recent current-account debits; they are pending and sum to 1,250.00. */
    private static final List<Object[]> PENDING = List.of(
            new Object[] {0, "MAXI 112", "499.99", "Kupovina karticom"},
            new Object[] {0, "WOLT BEOGRAD", "650.01", "Kupovina karticom"},
            new Object[] {1, "LIDL 0215 NOVI BEOGRAD", "100.00", "Kupovina karticom"});

    private static final String[][] SHOPS = {
            {"MAXI 112", "800", "6500"},
            {"MAXI 087 VRACAR", "500", "4800"},
            {"LIDL 0215 NOVI BEOGRAD", "900", "7200"},
            {"LIDL 0198 ZEMUN", "700", "5900"},
            {"NIS PETROL BS 1043", "3000", "7500"},
            {"DM DROGERIE 0412", "400", "3200"},
            {"WOLT BEOGRAD", "900", "3400"},
            {"APOTEKA BENU", "300", "2800"},
            {"IDEA 0331", "350", "2900"},
            {"GIGATRON 12", "2500", "18000"}};

    private final AccountRepository accounts;
    private final TransactionRepository transactions;
    private final CardRepository cards;
    private final PaymentRepository payments;
    private final IdempotencyStore idempotency;
    private final SessionStore sessions;
    private final DemoUser user;
    private final MockClock clock;

    public SeedData(AccountRepository accounts, TransactionRepository transactions, CardRepository cards,
            PaymentRepository payments, IdempotencyStore idempotency, SessionStore sessions, DemoUser user,
            MockClock clock) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.cards = cards;
        this.payments = payments;
        this.idempotency = idempotency;
        this.sessions = sessions;
        this.user = user;
        this.clock = clock;
    }

    @Override
    public void afterPropertiesSet() {
        reset();
    }

    /** Restores the seed and invalidates every ticket and token. */
    public synchronized void reset() {
        clock.reset();
        sessions.clear();
        idempotency.clear();
        payments.clear();
        transactions.clear();
        cards.clear();
        accounts.clear();
        user.reset();

        BigDecimal pendingTotal = PENDING.stream().map(p -> new BigDecimal((String) p[2])).reduce(BigDecimal.ZERO, BigDecimal::add);
        accounts.save(new Account(1, CURRENT, Iban.of("RS", "160000000012345678"), "Tekući račun", "TR", "RSD", "A",
                LocalDateTime.of(2019, 3, 14, 0, 0), CURRENT_AVAILABLE, CURRENT_AVAILABLE.add(pendingTotal)));
        accounts.save(new Account(2, SAVINGS, Iban.of("RS", "160000000098765432"), "Devizna štednja", "ST", "EUR", "A",
                LocalDateTime.of(2021, 6, 1, 0, 0), SAVINGS_AVAILABLE, SAVINGS_AVAILABLE));
        accounts.save(new Account(3, CARD, Iban.of("RS", "160000000055555511"), null, "KK", "RSD", "A",
                LocalDateTime.of(2023, 11, 20, 0, 0), CARD_AVAILABLE, CARD_AVAILABLE));

        cards.save(new Card(1, "4111********1111", "12/27", "DEBIT", CURRENT, false, null));
        cards.save(new Card(2, "5555********4444", "08/28", "CREDIT", CARD, false, new BigDecimal("150000.00")));

        seedTransactions(clock.today(), new Random(RANDOM_SEED));
    }

    private void seedTransactions(LocalDate today, Random random) {
        // Current account, monthly items (6 months x 6 = 36)
        for (int month = 0; month < 6; month++) {
            int base = 2 + 30 * month;
            monthly(today.minusDays(base + 3), new BigDecimal("168500.00").add(amount(random, 0, 4000)), "C",
                    "ECLEPT D.O.O.", "265-1100310008899-21", "Zarada za prethodni mesec", 0);
            monthly(today.minusDays(base + 8), amount(random, 3800, 7900), "D",
                    "JP EPS SNABDEVANJE", "160-0000000034567-12", "Električna energija", 0);
            monthly(today.minusDays(base + 10), amount(random, 2490, 3990), "D",
                    "TELEKOM SRBIJA A.D.", "160-0000000011223-45", "Mobilni i internet", 0);
            monthly(today.minusDays(base + 12), amount(random, 5200, 9400), "D",
                    "JKP INFOSTAN TEHNOLOGIJE", "205-0000000000123-88", "Komunalne usluge", 0);
            monthly(today.minusDays(base + 5), roundThousands(random, 5, 20), "D",
                    "BANKOMAT 160 KNEZ MIHAILOVA", null, "Isplata gotovine", 0);
            monthly(today.minusDays(base + 18), roundThousands(random, 3, 15), "D",
                    "BANKOMAT 160 TC USCE", null, random.nextInt(4) == 0 ? null : "Isplata gotovine", 0);
        }
        // Current account, card purchases (56 booked + 3 pending = 59)
        for (int i = 0; i < 56; i++) {
            String[] shop = SHOPS[random.nextInt(SHOPS.length)];
            LocalDate day = today.minusDays(2 + random.nextInt(175));
            String purpose = random.nextInt(10) == 0 ? null : "Kupovina karticom";
            String partner = random.nextInt(25) == 0 ? null : shop[0];
            BigDecimal amt = amount(random, Integer.parseInt(shop[1]), Integer.parseInt(shop[2]));
            transactions.add(CURRENT, day, day.plusDays(1 + random.nextInt(2)), amt, "D", "RSD", partner, null, purpose, "B");
        }
        for (Object[] p : PENDING) {
            LocalDate day = today.minusDays((int) p[0]);
            transactions.add(CURRENT, day, day.plusDays(1), new BigDecimal((String) p[2]), "D", "RSD", (String) p[1], null,
                    (String) p[3], "P");
        }
        // Savings (EUR): 6 monthly deposits + 2 interest credits = 8
        for (int month = 0; month < 6; month++) {
            LocalDate day = today.minusDays(4 + 30 * month);
            transactions.add(SAVINGS, day, day, new BigDecimal(150 + 50 * random.nextInt(4)).setScale(2), "C", "EUR",
                    "MARKO PETROVIC", null, "Uplata na štednju", "B");
        }
        transactions.add(SAVINGS, today.minusDays(93), today.minusDays(92), amount(random, 3, 9), "C", "EUR", null, null,
                "Kamata", "B");
        transactions.add(SAVINGS, today.minusDays(2), today.minusDays(1), amount(random, 3, 9), "C", "EUR", null, null,
                "Kamata", "B");
        // Card account: 6 repayments + 11 purchases = 17
        for (int month = 0; month < 6; month++) {
            LocalDate day = today.minusDays(6 + 30 * month);
            transactions.add(CARD, day, day, roundThousands(random, 10, 30), "C", "RSD", "MARKO PETROVIC", CURRENT,
                    "Uplata na kartični račun", "B");
        }
        for (int i = 0; i < 11; i++) {
            String[] shop = SHOPS[random.nextInt(SHOPS.length)];
            LocalDate day = today.minusDays(3 + random.nextInt(170));
            transactions.add(CARD, day, day.plusDays(2), amount(random, Integer.parseInt(shop[1]), Integer.parseInt(shop[2])),
                    "D", "RSD", shop[0], null, random.nextInt(5) == 0 ? null : "Kupovina karticom", "B");
        }
    }

    private void monthly(LocalDate day, BigDecimal amount, String dc, String partner, String partnerAcc, String purpose,
            int valOffset) {
        transactions.add(CURRENT, day, day.plusDays(valOffset), amount, dc, "RSD", partner, partnerAcc, purpose, "B");
    }

    private static BigDecimal amount(Random random, int min, int max) {
        long cents = (long) min * 100 + (long) (random.nextDouble() * (max - min) * 100);
        return BigDecimal.valueOf(cents, 2).setScale(2, RoundingMode.UNNECESSARY);
    }

    private static BigDecimal roundThousands(Random random, int minThousands, int maxThousands) {
        return BigDecimal.valueOf((minThousands + random.nextInt(maxThousands - minThousands + 1)) * 1000L).setScale(2);
    }
}
