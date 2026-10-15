package com.businessmanagementplateform.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record OrderSummaryResponse(
        Long id,
        String orderNumber,
        Long customerId,
        String customerName,
        Instant orderDate,
        String status,
        BigDecimal totalAmount,
        String createdBy
) {
}