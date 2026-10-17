package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateInvoiceRequest;
import com.businessmanagementplateform.backend.dto.InvoiceResponse;
import com.businessmanagementplateform.backend.dto.InvoiceSummaryResponse;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.entity.Invoice;
import com.businessmanagementplateform.backend.entity.Order;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import com.businessmanagementplateform.backend.enums.OrderStatus;
import com.businessmanagementplateform.backend.enums.PaymentStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.InvoiceMapper;
import com.businessmanagementplateform.backend.repository.InvoiceRepository;
import com.businessmanagementplateform.backend.repository.InvoiceSpecifications;
import com.businessmanagementplateform.backend.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Set;

@Service
public class InvoiceService {

    private static final Set<OrderStatus> INVOICEABLE_STATUSES =
            Set.of(OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED);

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final InvoiceMapper invoiceMapper;
    private final Clock clock;
    private final BigDecimal taxRatePercent;
    private final int paymentTermsDays;

    public InvoiceService(InvoiceRepository invoiceRepository,
                          OrderRepository orderRepository,
                          InvoiceMapper invoiceMapper,
                          Clock clock,
                          @Value("${app.invoice.tax-rate:19}") BigDecimal taxRatePercent,
                          @Value("${app.invoice.payment-terms-days:30}") int paymentTermsDays) {
        this.invoiceRepository = invoiceRepository;
        this.orderRepository = orderRepository;
        this.invoiceMapper = invoiceMapper;
        this.clock = clock;
        this.taxRatePercent = taxRatePercent;
        this.paymentTermsDays = paymentTermsDays;
    }

    @Transactional
    public InvoiceResponse generate(CreateInvoiceRequest request) {
        Order order = orderRepository.findByIdForUpdate(request.orderId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Order not found with id " + request.orderId()));

        if (!INVOICEABLE_STATUSES.contains(order.getStatus())) {
            throw new ConflictException("Cannot invoice an order with status " + order.getStatus()
                    + ": it must be CONFIRMED, SHIPPED or DELIVERED");
        }
        if (invoiceRepository.existsByOrderId(order.getId())) {
            throw new ConflictException("Order already invoiced: " + order.getOrderNumber());
        }

        BigDecimal subtotal = order.getTotalAmount().setScale(3, RoundingMode.HALF_UP);
        BigDecimal discount = request.discount() == null
                ? BigDecimal.ZERO.setScale(3)
                : request.discount().setScale(3, RoundingMode.HALF_UP);
        if (discount.compareTo(subtotal) > 0) {
            throw new ConflictException("Discount cannot exceed the order total: " + subtotal);
        }

        LocalDate issueDate = LocalDate.now(clock);
        LocalDate dueDate = request.dueDate() != null
                ? request.dueDate()
                : issueDate.plusDays(paymentTermsDays);
        if (dueDate.isBefore(issueDate)) {
            throw new ConflictException("Due date cannot be before the issue date: " + issueDate);
        }

        BigDecimal taxable = subtotal.subtract(discount);
        BigDecimal tax = taxable.multiply(taxRatePercent)
                .divide(BigDecimal.valueOf(100), 3, RoundingMode.HALF_UP);
        BigDecimal total = taxable.add(tax);
        // A zero-amount invoice (100 % discount) can never receive a payment: it is settled at creation.
        boolean settled = total.signum() == 0;
        Invoice invoice = Invoice.builder()
                .invoiceNumber(String.format("INV-%d-%05d", issueDate.getYear(),
                        invoiceRepository.nextInvoiceSequence()))
                .order(order)
                .issueDate(issueDate)
                .dueDate(dueDate)
                .subtotal(subtotal)
                .taxAmount(tax)
                .discount(discount)
                .totalAmount(total)
                .status(settled ? InvoiceStatus.PAID : InvoiceStatus.ISSUED)
                .paymentStatus(settled ? PaymentStatus.PAID : PaymentStatus.UNPAID)
                .build();

        return invoiceMapper.toResponse(invoiceRepository.saveAndFlush(invoice));
    }

    @Transactional(readOnly = true)
    public PageResponse<InvoiceSummaryResponse> findAll(String q, InvoiceStatus status,
                                                        PaymentStatus paymentStatus,
                                                        String ownerEmail, Pageable pageable) {
        return PageResponse.from(
                invoiceRepository.findAll(
                                InvoiceSpecifications.search(q, status, paymentStatus, ownerEmail), pageable)
                        .map(invoiceMapper::toSummary));
    }

    @Transactional(readOnly = true)
    public InvoiceResponse findById(Long id, String ownerEmail) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id " + id));

        if (ownerEmail != null
                && !invoice.getOrder().getCreatedBy().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new ResourceNotFoundException("Invoice not found with id " + id);
        }
        return invoiceMapper.toResponse(invoice);
    }
    @Transactional
    public InvoiceResponse cancel(Long id) {
        Invoice invoice = invoiceRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with id " + id));

        if (invoice.getStatus() != InvoiceStatus.ISSUED && invoice.getStatus() != InvoiceStatus.OVERDUE) {
            throw new ConflictException("Cannot cancel an invoice with status " + invoice.getStatus());
        }
        if (invoice.getPaymentStatus() != PaymentStatus.UNPAID) {
            throw new ConflictException(
                    "Cannot cancel an invoice that already has payments: " + invoice.getInvoiceNumber());
        }

        invoice.setStatus(InvoiceStatus.CANCELLED);
        return invoiceMapper.toResponse(invoiceRepository.saveAndFlush(invoice));
    }

    /** Flags the ISSUED invoices whose due date is past. Returns how many were flagged. */
    @Transactional
    public int markOverdue() {
        List<Invoice> late = invoiceRepository.findByStatusAndDueDateBefore(
                InvoiceStatus.ISSUED, LocalDate.now(clock));
        if (late.isEmpty()) {
            return 0;
        }
        late.forEach(invoice -> invoice.setStatus(InvoiceStatus.OVERDUE));
        invoiceRepository.saveAll(late);
        return late.size();
    }
}