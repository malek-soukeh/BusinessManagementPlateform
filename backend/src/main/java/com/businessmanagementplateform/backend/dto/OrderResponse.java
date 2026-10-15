package com.businessmanagementplateform.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
        Long id,
        String orderNumber,
        Long customerId,
        String customerName,
        Instant orderDate,
        String status,
        BigDecimal totalAmount,
        String createdBy,
        List<OrderItemResponse> items,
        Instant createdAt,
        Instant updatedAt
) {
}