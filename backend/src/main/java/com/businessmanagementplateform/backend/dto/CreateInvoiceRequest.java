package com.businessmanagementplateform.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateInvoiceRequest(
        @NotNull
        Long orderId,

        @DecimalMin("0.0") @Digits(integer = 11, fraction = 3)
        BigDecimal discount,

        LocalDate dueDate
) {
}