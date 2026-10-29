package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.entity.AuditLog;
import com.businessmanagementplateform.backend.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Writes the audit trail.
 * <p>
 * Each entry is written in its own transaction: a failed login (whose own transaction is rolled back) is
 * still recorded, and a read-only transaction does not forbid the insert. A failure to write the trail is
 * logged but never breaks the operation of the user: the trail is a record, not a condition.
 */
@Service
public class AuditService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final TransactionTemplate transaction;

    public AuditService(AuditLogRepository auditLogRepository, PlatformTransactionManager transactionManager) {
        this.auditLogRepository = auditLogRepository;
        this.transaction = new TransactionTemplate(transactionManager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void record(AuditEntry entry) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .userEmail(limit(entry.userEmail() == null ? "anonymous" : entry.userEmail(), 255))
                    .action(limit(entry.action(), 50))
                    .entityType(limit(entry.entityType(), 30))
                    .entityId(entry.entityId())
                    .entityLabel(limit(entry.entityLabel(), 255))
                    .httpMethod(limit(entry.httpMethod(), 10))
                    .path(limit(entry.path(), 255))
                    .details(limit(entry.details(), 500))
                    .build();
            transaction.executeWithoutResult(status -> auditLogRepository.save(auditLog));
        } catch (RuntimeException ex) {
            LOGGER.error("Audit entry not recorded ({} by {})", entry.action(), entry.userEmail(), ex);
        }
    }

    private static String limit(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }
}
