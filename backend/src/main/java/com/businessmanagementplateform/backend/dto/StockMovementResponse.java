package com.businessmanagementplateform.backend.dto;

import java.time.Instant;

public record StockMovementResponse(
        Long id,
        Long productId,
        String productReference,
        String productName,
        Integer quantityChange,
        Integer quantityAfter,
        String reason,
        Long orderId,
        String note,
        String createdBy,
        Instant createdAt
) {
}