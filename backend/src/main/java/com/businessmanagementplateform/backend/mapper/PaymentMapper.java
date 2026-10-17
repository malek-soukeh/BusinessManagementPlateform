package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.PaymentResponse;
import com.businessmanagementplateform.backend.entity.Payment;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {

    public PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getInvoice().getId(),
                payment.getInvoice().getInvoiceNumber(),
                payment.getAmount(),
                payment.getMethod().name(),
                payment.getPaymentDate(),
                payment.getCreatedBy().getEmail(),
                payment.getCreatedAt());
    }
}