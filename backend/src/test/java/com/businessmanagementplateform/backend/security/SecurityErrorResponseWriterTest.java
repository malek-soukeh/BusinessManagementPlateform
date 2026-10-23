package com.businessmanagementplateform.backend.security;

import com.businessmanagementplateform.backend.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityErrorResponseWriterTest {

    private final MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/customers");
    private final MockHttpServletResponse response = new MockHttpServletResponse();

    @Test
    void write_usesTheSameJsonShapeAsTheOtherApiErrors() throws IOException {
        SecurityErrorResponseWriter.write(request, response, HttpStatus.UNAUTHORIZED,
                ErrorCode.UNAUTHENTICATED, "Authentication required");

        String body = response.getContentAsString();
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).startsWith("application/json");
        assertThat(body)
                .contains("\"status\":401")
                .contains("\"error\":\"UNAUTHORIZED\"")
                .contains("\"code\":\"UNAUTHENTICATED\"")
                .contains("\"message\":\"Authentication required\"")
                .contains("\"path\":\"/api/customers\"");
    }

    @Test
    void write_reportsAnAccessDeniedAsForbidden() throws IOException {
        SecurityErrorResponseWriter.write(request, response, HttpStatus.FORBIDDEN,
                ErrorCode.ACCESS_DENIED, "Access denied");

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString())
                .contains("\"error\":\"FORBIDDEN\"")
                .contains("\"code\":\"ACCESS_DENIED\"");
    }

    @Test
    void write_putsAnIsoInstantInTheTimestamp() throws IOException {
        SecurityErrorResponseWriter.write(request, response, HttpStatus.UNAUTHORIZED,
                ErrorCode.UNAUTHENTICATED, "x");

        assertThat(response.getContentAsString())
                .containsPattern("\"timestamp\":\"\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z\"");
    }

    @Test
    void write_escapesQuotesBackslashesAndControlCharacters() throws IOException {
        request.setRequestURI("/api/a\"b");

        SecurityErrorResponseWriter.write(request, response, HttpStatus.FORBIDDEN, ErrorCode.ACCESS_DENIED,
                "say \"hi\" \\ line1\nline2\ttab \u0001");

        assertThat(response.getContentAsString())
                .contains("\"message\":\"say \\\"hi\\\" \\\\ line1\\nline2\\ttab \\u0001\"")
                .contains("\"path\":\"/api/a\\\"b\"");
    }

    @Test
    void write_keepsAccentedCharactersInUtf8() throws IOException {
        SecurityErrorResponseWriter.write(request, response, HttpStatus.FORBIDDEN, ErrorCode.ACCESS_DENIED,
                "Acc\u00e8s refus\u00e9");

        assertThat(response.getCharacterEncoding()).isEqualTo("UTF-8");
        assertThat(response.getContentAsString()).contains("Acc\u00e8s refus\u00e9");
    }
}
