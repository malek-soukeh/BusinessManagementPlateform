package com.businessmanagementplateform.backend.dto;

import java.time.Instant;

public record AuditLogResponse(
        Long id,
        String userEmail,
        String action,
        String entityType,
        Long entityId,
        String entityLabel,
        String httpMethod,
        String path,
        String details,
        Instant createdAt
) {
}
