package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.entity.AuditLog;
import com.businessmanagementplateform.backend.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    private AuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(auditLogRepository, transactionManager);
    }

    @Test
    void record_savesEveryFieldOfTheEntry() {
        auditService.record(new AuditEntry("manager@techdistrib.tn", "UPDATE_PRODUCT", "PRODUCT", 7L,
                "PC001", "PUT", "/api/products/7", "price"));

        ArgumentCaptor<AuditLog> saved = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(saved.capture());
        AuditLog log = saved.getValue();
        assertThat(log.getUserEmail()).isEqualTo("manager@techdistrib.tn");
        assertThat(log.getAction()).isEqualTo("UPDATE_PRODUCT");
        assertThat(log.getEntityType()).isEqualTo("PRODUCT");
        assertThat(log.getEntityId()).isEqualTo(7L);
        assertThat(log.getEntityLabel()).isEqualTo("PC001");
        assertThat(log.getHttpMethod()).isEqualTo("PUT");
        assertThat(log.getPath()).isEqualTo("/api/products/7");
        assertThat(log.getDetails()).isEqualTo("price");
    }

    @Test
    void record_cutsTheValuesThatDoNotFitTheColumns() {
        String tooLong = "x".repeat(600);

        auditService.record(new AuditEntry(tooLong, "LOGIN_FAILED", "USER", null, tooLong, "POST", tooLong, tooLong));

        ArgumentCaptor<AuditLog> saved = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(saved.capture());
        assertThat(saved.getValue().getUserEmail()).hasSize(255);
        assertThat(saved.getValue().getEntityLabel()).hasSize(255);
        assertThat(saved.getValue().getPath()).hasSize(255);
        assertThat(saved.getValue().getDetails()).hasSize(500);
    }

    @Test
    void record_neverBreaksTheOperationWhenTheTrailCannotBeWritten() {
        when(auditLogRepository.save(any(AuditLog.class))).thenThrow(new IllegalStateException("database down"));

        assertThatCode(() -> auditService.record(new AuditEntry("a@b.tn", "CREATE_ORDER", "ORDER", 1L,
                null, "POST", "/api/orders", null)))
                .doesNotThrowAnyException();
    }
}
