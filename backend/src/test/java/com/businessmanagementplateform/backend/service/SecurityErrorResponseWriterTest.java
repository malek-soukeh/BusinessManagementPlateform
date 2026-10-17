package com.businessmanagementplateform.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityErrorResponseWriterTest {

    @Test
    void entryPoint_writesAJson401WithTheBearerChallenge() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/orders");
        MockHttpServletResponse response = new MockHttpServletResponse();

        new RestAuthenticationEntryPoint().commence(request, response, new BadCredentialsException("x"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat(response.getHeader("WWW-Authenticate")).isEqualTo("Bearer");
        assertThat(response.getContentAsString()).contains(
                "\"status\":401", "\"error\":\"Unauthorized\"",
                "\"message\":\"Authentication required", "\"path\":\"/api/orders\"", "\"timestamp\":\"");
    }

    @Test
    void accessDeniedHandler_writesAJson403() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/invoices");
        MockHttpServletResponse response = new MockHttpServletResponse();

        new RestAccessDeniedHandler().handle(request, response, new AccessDeniedException("x"));

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat(response.getContentAsString()).contains(
                "\"status\":403", "\"error\":\"Forbidden\"",
                "\"message\":\"Access denied", "\"path\":\"/api/invoices\"");
    }

    @Test
    void writer_escapesQuotesAndBackslashesInThePath() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/a\"b\\c");
        MockHttpServletResponse response = new MockHttpServletResponse();

        new RestAuthenticationEntryPoint().commence(request, response, new BadCredentialsException("x"));

        assertThat(response.getContentAsString()).contains("\"path\":\"/api/a\\\"b\\\\c\"");
    }

    @Test
    void writer_producesBodyWithoutRawControlCharacters() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/x\ny");
        MockHttpServletResponse response = new MockHttpServletResponse();

        new RestAccessDeniedHandler().handle(request, response, new AccessDeniedException("x"));

        assertThat(response.getContentAsString()).doesNotContain("\n").contains("/api/x\\ny");
    }
}