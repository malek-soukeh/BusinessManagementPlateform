package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.AuditLogResponse;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.mapper.AuditLogMapper;
import com.businessmanagementplateform.backend.repository.AuditLogRepository;
import com.businessmanagementplateform.backend.repository.AuditLogSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;

/** Reads the audit trail. There is deliberately no way to change or delete an entry. */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper auditLogMapper;
    private final Clock clock;

    /** The dates are days of the company (Africa/Tunis): {@code to} is included. */
    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> findAll(String q, String user, String action, String entityType,
                                                  LocalDate from, LocalDate to, Pageable pageable) {
        Instant start = from == null ? null : from.atStartOfDay(clock.getZone()).toInstant();
        Instant end = to == null ? null : to.plusDays(1).atStartOfDay(clock.getZone()).toInstant();

        return PageResponse.from(
                auditLogRepository.findAll(
                                AuditLogSpecifications.search(q, user, action, entityType, start, end), pageable)
                        .map(auditLogMapper::toResponse));
    }
}
