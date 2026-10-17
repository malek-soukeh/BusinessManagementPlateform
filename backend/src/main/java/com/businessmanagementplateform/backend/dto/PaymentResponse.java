package com.businessmanagementplateform.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
        Long id,
        Long invoiceId,
        String invoiceNumber,
        BigDecimal amount,
        String method,
        Instant paymentDate,
        String createdBy,
        Instant createdAt
) {
}