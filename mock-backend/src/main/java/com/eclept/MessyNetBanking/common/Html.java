package com.eclept.MessyNetBanking.common;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpServletResponse;

/** The legacy app server answers errors in HTML. */
public final class Html {

    public static final MediaType TEXT_HTML_UTF8 = new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8);

    private Html() {
    }

    public static String page(String title) {
        return "<html><body><h1>" + title + "</h1></body></html>";
    }

    public static ResponseEntity<String> response(HttpStatusCode status, String title) {
        return ResponseEntity.status(status).contentType(TEXT_HTML_UTF8).body(page(title));
    }

    public static void write503(HttpServletResponse response) throws IOException {
        response.setStatus(503);
        response.setHeader("Retry-After", "5");
        response.setContentType(TEXT_HTML_UTF8.toString());
        response.getWriter().write(page("Service Unavailable"));
    }
}
