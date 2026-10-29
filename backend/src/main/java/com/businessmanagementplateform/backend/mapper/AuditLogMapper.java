package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.AuditLogResponse;
import com.businessmanagementplateform.backend.entity.AuditLog;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {

    public AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getUserEmail(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getEntityLabel(),
                log.getHttpMethod(),
                log.getPath(),
                log.getDetails(),
                log.getCreatedAt());
    }
}
