package com.businessmanagementplateform.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;

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
        @Schema(description = "Somme des paiements reçus, calculée par le serveur (3 décimales).", example = "500.000")
        BigDecimal paidAmount,
        @Schema(description = "Reste à payer : total TTC moins les paiements, jamais négatif ; 0 pour une facture annulée.",
                example = "571.000")
        BigDecimal remainingAmount,
        String status,
        String paymentStatus
) {
}
