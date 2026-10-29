package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.AuditLogResponse;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.entity.AuditLog;
import com.businessmanagementplateform.backend.mapper.AuditLogMapper;
import com.businessmanagementplateform.backend.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-15T10:00:00Z"), ZoneId.of("Africa/Tunis"));

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditLogService auditLogService;

    @BeforeEach
    void setUp() {
        auditLogService = new AuditLogService(auditLogRepository, new AuditLogMapper(), CLOCK);
    }

    private AuditLog entry() {
        return AuditLog.builder().id(1L).userEmail("manager@techdistrib.tn").action("CREATE_ORDER")
                .entityType("ORDER").entityId(5L).entityLabel("ORD-2026-00005").httpMethod("POST")
                .path("/api/orders").createdAt(Instant.parse("2026-10-15T09:00:00Z")).build();
    }

    @Test
    void findAll_returnsAPageOfMappedEntries() {
        Pageable pageable = PageRequest.of(0, 20);
        when(auditLogRepository.findAll(ArgumentMatchers.<Specification<AuditLog>>any(), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(entry()), pageable, 1));

        PageResponse<AuditLogResponse> result =
                auditLogService.findAll(null, null, "CREATE_ORDER", null, null, null, pageable);

        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.content().get(0).action()).isEqualTo("CREATE_ORDER");
        assertThat(result.content().get(0).entityLabel()).isEqualTo("ORD-2026-00005");
    }

    @Test
    void findAll_acceptsADateRangeOfTheCompanyDays() {
        Pageable pageable = PageRequest.of(0, 20);
        when(auditLogRepository.findAll(ArgumentMatchers.<Specification<AuditLog>>any(), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        PageResponse<AuditLogResponse> result = auditLogService.findAll(
                null, null, null, null, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 15), pageable);

        assertThat(result.content()).isEmpty();
        verify(auditLogRepository).findAll(ArgumentMatchers.<Specification<AuditLog>>any(), eq(pageable));
    }
}
