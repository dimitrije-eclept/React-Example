package com.eclept.MessyNetBanking.transfers;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

import org.springframework.stereotype.Component;

/** Remembers the first response per (user, Idempotency-Key). Request bodies are not compared. */
@Component
public class IdempotencyStore {

    private final Map<String, Object> responses = new ConcurrentHashMap<>();

    /**
     * computeIfAbsent runs the action at most once per key, even for concurrent duplicates.
     * If the action throws (validation, 404) nothing is stored and the key can be reused.
     */
    public Object once(String user, String key, Supplier<Object> action) {
        return responses.computeIfAbsent(user + "\u0000" + key, k -> action.get());
    }

    public void clear() {
        responses.clear();
    }
}
