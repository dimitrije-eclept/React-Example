package com.eclept.MessyNetBanking.auth;

import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Missing, unknown or expired bearer token: 401 with an EMPTY body (no JSON, no HTML). */
@Component
public class BearerAuthInterceptor implements HandlerInterceptor {

    public static final String USER_ATTR = "messy.user";
    public static final String TOKEN_ATTR = "messy.token";

    private final SessionStore sessions;

    public BearerAuthInterceptor(SessionStore sessions) {
        this.sessions = sessions;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (CorsUtils.isPreFlightRequest(request)) {
            return true;
        }
        String header = request.getHeader("Authorization");
        String token = header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)
                ? header.substring(7).trim()
                : null;
        return sessions.authenticate(token).map(user -> {
            request.setAttribute(USER_ATTR, user);
            request.setAttribute(TOKEN_ATTR, token);
            return true;
        }).orElseGet(() -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentLength(0);
            return false;
        });
    }
}
