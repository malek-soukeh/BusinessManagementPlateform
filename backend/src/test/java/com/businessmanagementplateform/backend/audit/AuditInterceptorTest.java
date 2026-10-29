package com.businessmanagementplateform.backend.audit;

import com.businessmanagementplateform.backend.security.CurrentUser;
import com.businessmanagementplateform.backend.service.AuditEntry;
import com.businessmanagementplateform.backend.service.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditInterceptorTest {

    @Mock
    private AuditService auditService;

    @Mock
    private CurrentUser currentUser;

    private AuditInterceptor interceptor;
    private final MockHttpServletResponse response = new MockHttpServletResponse();

    @BeforeEach
    void setUp() {
        interceptor = new AuditInterceptor(auditService, currentUser);
    }

    private void complete(MockHttpServletRequest request, int status) {
        response.setStatus(status);
        interceptor.afterCompletion(request, response, new Object(), null);
    }

    @Test
    void recordsACreationWithTheIdAndTheLabelOfTheAnswer() {
        when(currentUser.email()).thenReturn("manager@techdistrib.tn");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/customers");
        request.setAttribute(AuditResponseAdvice.ATTRIBUTE, new AuditResponseAdvice.Target(12L, "a@b.tn"));

        complete(request, 201);

        ArgumentCaptor<AuditEntry> entry = ArgumentCaptor.forClass(AuditEntry.class);
        verify(auditService).record(entry.capture());
        assertThat(entry.getValue().userEmail()).isEqualTo("manager@techdistrib.tn");
        assertThat(entry.getValue().action()).isEqualTo("CREATE_CUSTOMER");
        assertThat(entry.getValue().entityId()).isEqualTo(12L);
        assertThat(entry.getValue().entityLabel()).isEqualTo("a@b.tn");
        assertThat(entry.getValue().httpMethod()).isEqualTo("POST");
        assertThat(entry.getValue().path()).isEqualTo("/api/customers");
    }

    @Test
    void theIdOfTheRouteWinsOverTheOneOfTheAnswer() {
        when(currentUser.email()).thenReturn("manager@techdistrib.tn");
        MockHttpServletRequest request = new MockHttpServletRequest("PUT", "/api/products/7");
        request.setAttribute(AuditResponseAdvice.ATTRIBUTE, new AuditResponseAdvice.Target(99L, "PC001"));

        complete(request, 200);

        ArgumentCaptor<AuditEntry> entry = ArgumentCaptor.forClass(AuditEntry.class);
        verify(auditService).record(entry.capture());
        assertThat(entry.getValue().action()).isEqualTo("UPDATE_PRODUCT");
        assertThat(entry.getValue().entityId()).isEqualTo(7L);
        assertThat(entry.getValue().entityLabel()).isEqualTo("PC001");
    }

    @Test
    void recordsADeletionThatAnswersWithoutBody() {
        when(currentUser.email()).thenReturn("admin@techdistrib.tn");

        complete(new MockHttpServletRequest("DELETE", "/api/users/3"), 204);

        ArgumentCaptor<AuditEntry> entry = ArgumentCaptor.forClass(AuditEntry.class);
        verify(auditService).record(entry.capture());
        assertThat(entry.getValue().action()).isEqualTo("DELETE_USER");
        assertThat(entry.getValue().entityId()).isEqualTo(3L);
        assertThat(entry.getValue().entityLabel()).isNull();
    }

    @Test
    void recordsNothingForARefusedOperationOrARead() {
        complete(new MockHttpServletRequest("POST", "/api/orders"), 409);
        complete(new MockHttpServletRequest("PUT", "/api/orders/4"), 403);
        complete(new MockHttpServletRequest("GET", "/api/orders"), 200);
        complete(new MockHttpServletRequest("POST", "/api/auth/login"), 200);

        verify(auditService, never()).record(any(AuditEntry.class));
    }
}
