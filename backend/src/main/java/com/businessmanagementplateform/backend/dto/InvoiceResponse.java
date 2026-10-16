package com.businessmanagementplateform.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record InvoiceResponse(
        Long id,
        String invoiceNumber,
        Long orderId,
        String orderNumber,
        Long customerId,
        String customerName,
        LocalDate issueDate,
        LocalDate dueDate,
        BigDecimal subtotal,
        BigDecimal taxAmount,
        BigDecimal discount,
        BigDecimal totalAmount,
        String status,
        String paymentStatus,
        List<OrderItemResponse> items,
        Instant createdAt,
        Instant updatedAt
) {
}