package com.eclept.MessyNetBanking.cards;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;

@Repository
public class CardRepository {

    private final Map<String, Card> cards = new ConcurrentHashMap<>();

    public void save(Card card) {
        cards.put(card.pan(), card);
    }

    public List<Card> findAll() {
        return cards.values().stream().sorted(Comparator.comparingInt(Card::seq)).toList();
    }

    /** Atomically flips the blocked flag; empty if the PAN is unknown. */
    public Optional<Card> setBlocked(String pan, boolean blocked) {
        return pan == null ? Optional.empty() : Optional.ofNullable(cards.computeIfPresent(pan, (k, c) -> c.withBlocked(blocked)));
    }

    public void clear() {
        cards.clear();
    }
}
