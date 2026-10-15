package com.businessmanagementplateform.backend.dto;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long productId,
        String productReference,
        String productName,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal
) {
}