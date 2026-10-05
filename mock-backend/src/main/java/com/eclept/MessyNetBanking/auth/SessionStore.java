package com.eclept.MessyNetBanking.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import com.eclept.MessyNetBanking.common.Ids;
import com.eclept.MessyNetBanking.common.MessyProperties;
import com.eclept.MessyNetBanking.common.OtpAttempts;

/** Login tickets, access and refresh tokens. Opaque random strings, real wall-clock expiry. */
@Component
public class SessionStore {

    public static final class LoginTicket {
        final String id;
        final String username;
        final Instant expiresAt;
        final OtpAttempts otp = new OtpAttempts();

        LoginTicket(String id, String username, Instant expiresAt) {
            this.id = id;
            this.username = username;
            this.expiresAt = expiresAt;
        }
    }

    record AccessToken(String username, Instant expiresAt, String refreshToken) {
    }

    record RefreshToken(String username, Instant expiresAt, String accessToken) {
    }

    public record IssuedTokens(String accessToken, String refreshToken, long expiresIn) {
    }

    private final Map<String, LoginTicket> tickets = new ConcurrentHashMap<>();
    private final Map<String, AccessToken> accessTokens = new ConcurrentHashMap<>();
    private final Map<String, RefreshToken> refreshTokens = new ConcurrentHashMap<>();
    private final MessyProperties.Auth config;

    public SessionStore(MessyProperties properties) {
        this.config = properties.auth();
    }

    public LoginTicket newTicket(String username) {
        String id = "LT-" + Ids.opaque(18);
        LoginTicket ticket = new LoginTicket(id, username, Instant.now().plusSeconds(config.ticketTtlSeconds()));
        tickets.put(id, ticket);
        return ticket;
    }

    public Optional<LoginTicket> ticket(String id) {
        if (id == null) {
            return Optional.empty();
        }
        LoginTicket ticket = tickets.get(id);
        if (ticket != null && Instant.now().isAfter(ticket.expiresAt)) {
            tickets.remove(id);
            return Optional.empty();
        }
        return Optional.ofNullable(ticket);
    }

    public void killTicket(String id) {
        tickets.remove(id);
    }

    public IssuedTokens issue(String username) {
        Instant now = Instant.now();
        String access = Ids.opaque(32);
        String refresh = Ids.opaque(48);
        accessTokens.put(access, new AccessToken(username, now.plusSeconds(config.accessTtlSeconds()), refresh));
        refreshTokens.put(refresh, new RefreshToken(username, now.plus(Duration.ofSeconds(config.refreshTtlSeconds())), access));
        return new IssuedTokens(access, refresh, config.accessTtlSeconds());
    }

    /** One-shot: the presented refresh token is consumed whether or not it is still valid. */
    public Optional<IssuedTokens> rotate(String refreshToken) {
        if (refreshToken == null) {
            return Optional.empty();
        }
        RefreshToken old = refreshTokens.remove(refreshToken);
        if (old == null || Instant.now().isAfter(old.expiresAt())) {
            return Optional.empty();
        }
        return Optional.of(issue(old.username()));
    }

    public Optional<String> authenticate(String accessToken) {
        if (accessToken == null) {
            return Optional.empty();
        }
        AccessToken token = accessTokens.get(accessToken);
        if (token == null) {
            return Optional.empty();
        }
        if (Instant.now().isAfter(token.expiresAt())) {
            accessTokens.remove(accessToken);
            return Optional.empty();
        }
        return Optional.of(token.username());
    }

    public void logout(String accessToken) {
        AccessToken token = accessTokens.remove(accessToken);
        if (token != null) {
            refreshTokens.remove(token.refreshToken());
        }
    }

    public long activeSessionCount() {
        Instant now = Instant.now();
        accessTokens.values().removeIf(t -> now.isAfter(t.expiresAt()));
        return accessTokens.size();
    }

    public void clear() {
        tickets.clear();
        accessTokens.clear();
        refreshTokens.clear();
    }
}
