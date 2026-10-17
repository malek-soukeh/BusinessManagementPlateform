package com.businessmanagementplateform.backend.dto;

import com.businessmanagementplateform.backend.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.math.BigDecimal;
import java.time.Instant;

public record CreatePaymentRequest(
        @NotNull @DecimalMin("0.001") @Digits(integer = 11, fraction = 3)
        BigDecimal amount,

        @NotNull
        PaymentMethod method,

        @PastOrPresent
        Instant paymentDate
) {
}