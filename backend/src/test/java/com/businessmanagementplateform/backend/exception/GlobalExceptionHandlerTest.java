package com.businessmanagementplateform.backend.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.authentication.BadCredentialsException;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/customers");

    @Test
    void handleConflict_usesTheGenericCode_whenTheExceptionHasNone() {
        ResponseEntity<ApiError> response = handler.handleConflict(new ConflictException("Something clashes"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().code()).isEqualTo(ErrorCode.CONFLICT);
        assertThat(response.getBody().message()).isEqualTo("Something clashes");
    }

    @Test
    void handleConflict_exposesTheCodeOfTheException() {
        ResponseEntity<ApiError> response = handler.handleConflict(
                new ConflictException(ErrorCode.EMAIL_ALREADY_USED, "Email already in use: a@b.tn"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().code()).isEqualTo(ErrorCode.EMAIL_ALREADY_USED);
        assertThat(response.getBody().error()).isEqualTo("CONFLICT");
    }

    @Test
    void handleNotFound_usesTheGenericCode_whenTheExceptionHasNone() {
        ResponseEntity<ApiError> response = handler.handleNotFound(
                new ResourceNotFoundException("Invoice not found with id 9"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().code()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
        assertThat(response.getBody().error()).isEqualTo("NOT_FOUND");
    }

    @Test
    void handleNotFound_exposesTheCodeOfTheException() {
        ResponseEntity<ApiError> response = handler.handleNotFound(
                new ResourceNotFoundException(ErrorCode.PARENT_CATEGORY_NOT_FOUND, "Parent category not found"), request);

        assertThat(response.getBody().code()).isEqualTo(ErrorCode.PARENT_CATEGORY_NOT_FOUND);
    }

    @Test
    void handleAuthentication_reportsInvalidCredentials() {
        ResponseEntity<ApiError> response = handler.handleAuthentication(new BadCredentialsException("bad"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().code()).isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    @Test
    void handleOptimisticLock_reportsAConcurrentModification() {
        ResponseEntity<ApiError> response = handler.handleOptimisticLock(
                new ObjectOptimisticLockingFailureException(String.class, 1L), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().code()).isEqualTo(ErrorCode.CONCURRENT_MODIFICATION);
    }

    @Test
    void handleDataIntegrity_reportsAnIntegrityViolation() {
        ResponseEntity<ApiError> response = handler.handleDataIntegrity(
                new DataIntegrityViolationException("fk"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().code()).isEqualTo(ErrorCode.DATA_INTEGRITY_VIOLATION);
    }

    @Test
    void everyError_carriesAnInstantTimestampAndThePathOfTheRequest() {
        Instant before = Instant.now();

        ApiError body = handler.handleConflict(new ConflictException("x"), request).getBody();

        assertThat(body.timestamp()).isBetween(before, Instant.now());
        assertThat(body.path()).isEqualTo("/api/customers");
        assertThat(body.status()).isEqualTo(409);
    }
}
