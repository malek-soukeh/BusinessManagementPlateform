package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreatePaymentRequest;
import com.businessmanagementplateform.backend.dto.PaymentResponse;
import com.businessmanagementplateform.backend.entity.Invoice;
import com.businessmanagementplateform.backend.entity.Payment;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import com.businessmanagementplateform.backend.enums.PaymentStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.PaymentMapper;
import com.businessmanagementplateform.backend.repository.InvoiceRepository;
import com.businessmanagementplateform.backend.repository.PaymentRepository;
import com.businessmanagementplateform.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final Set<InvoiceStatus> PAYABLE_STATUSES =
            Set.of(InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE);

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final PaymentMapper paymentMapper;
    private final Clock clock;

    @Transactional
    public PaymentResponse record(Long invoiceId, CreatePaymentRequest request, String userEmail) {
        // The row lock serializes simultaneous payments on the same invoice.
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id " + invoiceId));

        if (!PAYABLE_STATUSES.contains(invoice.getStatus())) {
            throw new ConflictException(
                    "Cannot register a payment on an invoice with status " + invoice.getStatus());
        }

        BigDecimal amount = request.amount().setScale(3, RoundingMode.HALF_UP);
        BigDecimal remaining = invoice.getTotalAmount().subtract(paidAmount(invoiceId));
        if (amount.compareTo(remaining) > 0) {
            throw new ConflictException("Payment exceeds the remaining balance: " + remaining
                    + " left on invoice " + invoice.getInvoiceNumber());
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Payment payment = paymentRepository.saveAndFlush(Payment.builder()
                .invoice(invoice)
                .amount(amount)
                .method(request.method())
                .paymentDate(request.paymentDate() != null ? request.paymentDate() : Instant.now(clock))
                .createdBy(user)
                .build());

        boolean settled = amount.compareTo(remaining) == 0;
        invoice.setPaymentStatus(settled ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID);
        if (settled) {
            invoice.setStatus(InvoiceStatus.PAID);
        }
        invoiceRepository.saveAndFlush(invoice);

        return paymentMapper.toResponse(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> findByInvoice(Long invoiceId, String ownerEmail) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id " + invoiceId));

        if (ownerEmail != null
                && !invoice.getOrder().getCreatedBy().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new ResourceNotFoundException("Invoice not found with id " + invoiceId);
        }

        return paymentRepository.findByInvoiceIdOrderByPaymentDateDescIdDesc(invoiceId).stream()
                .map(paymentMapper::toResponse)
                .toList();
    }

    private BigDecimal paidAmount(Long invoiceId) {
        BigDecimal sum = paymentRepository.sumAmountByInvoiceId(invoiceId);
        return sum == null ? BigDecimal.ZERO : sum;
    }
}