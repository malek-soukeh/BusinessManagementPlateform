package com.businessmanagementplateform.backend.service;

/** What is written in the audit trail. Nothing here may contain a password or a token. */
public record AuditEntry(
        String userEmail,
        String action,
        String entityType,
        Long entityId,
        String entityLabel,
        String httpMethod,
        String path,
        String details
) {
}
