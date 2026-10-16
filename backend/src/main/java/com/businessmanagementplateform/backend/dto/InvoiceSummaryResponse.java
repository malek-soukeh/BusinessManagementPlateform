package com.businessmanagementplateform.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InvoiceSummaryResponse(
        Long id,
        String invoiceNumber,
        Long orderId,
        String orderNumber,
        Long customerId,
        String customerName,
        LocalDate issueDate,
        LocalDate dueDate,
        BigDecimal totalAmount,
        String status,
        String paymentStatus
) {
}