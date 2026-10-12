package com.businessmanagementplateform.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
        Long id,
        String reference,
        String name,
        String description,
        BigDecimal purchasePrice,
        BigDecimal sellingPrice,
        Integer quantity,
        Integer minimumStock,
        boolean lowStock,
        Long categoryId,
        String categoryName,
        String status,
        Long version,
        Instant createdAt,
        Instant updatedAt
) {
}