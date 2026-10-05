package com.eclept.MessyNetBanking.accounts;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

import org.springframework.stereotype.Repository;

@Repository
public class AccountRepository {

    private final Map<String, Account> accounts = new ConcurrentHashMap<>();

    public void save(Account account) {
        accounts.put(account.accNo(), account);
    }

    public Optional<Account> find(String accNo) {
        return accNo == null ? Optional.empty() : Optional.ofNullable(accounts.get(accNo));
    }

    public List<Account> findAll() {
        return accounts.values().stream().sorted(Comparator.comparingInt(Account::seq)).toList();
    }

    public void clear() {
        accounts.clear();
    }

    /** Runs {@code action} holding both account monitors, always acquired in accNo order. */
    public static <T> T withLocks(Account a, Account b, Supplier<T> action) {
        Account first = a.accNo().compareTo(b.accNo()) <= 0 ? a : b;
        Account second = first == a ? b : a;
        synchronized (first) {
            synchronized (second) {
                return action.get();
            }
        }
    }
}
