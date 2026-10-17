package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.DashboardStatsResponse;
import com.businessmanagementplateform.backend.enums.CustomerStatus;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import com.businessmanagementplateform.backend.enums.OrderStatus;
import com.businessmanagementplateform.backend.enums.ProductStatus;
import com.businessmanagementplateform.backend.repository.CustomerRepository;
import com.businessmanagementplateform.backend.repository.InvoiceRepository;
import com.businessmanagementplateform.backend.repository.OrderRepository;
import com.businessmanagementplateform.backend.repository.PaymentRepository;
import com.businessmanagementplateform.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final List<InvoiceStatus> REVENUE_STATUSES =
            List.of(InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE, InvoiceStatus.PAID);

    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    /**
     * @param ownerEmail null for ADMIN and MANAGER (global figures); the employee's email to restrict
     *                   orders and invoices to his own orders. Money totals are only given when null.
     */
    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats(String ownerEmail) {
        Map<String, Long> ordersByStatus = new LinkedHashMap<>();
        long totalOrders = 0;
        for (OrderStatus status : OrderStatus.values()) {
            long count = countOrders(status, ownerEmail);
            ordersByStatus.put(status.name(), count);
            totalOrders += count;
        }

        long overdue = countInvoices(InvoiceStatus.OVERDUE, ownerEmail);
        long unpaid = countInvoices(InvoiceStatus.ISSUED, ownerEmail) + overdue;

        BigDecimal revenue = null;
        BigDecimal collected = null;
        BigDecimal outstanding = null;
        if (ownerEmail == null) {
            revenue = money(invoiceRepository.sumTotalByStatusIn(REVENUE_STATUSES));
            collected = money(paymentRepository.sumAllAmounts());
            outstanding = revenue.subtract(collected);
        }

        return new DashboardStatsResponse(
                customerRepository.countByStatus(CustomerStatus.ACTIVE),
                productRepository.countByStatus(ProductStatus.ACTIVE),
                productRepository.countLowStock(ProductStatus.ACTIVE),
                totalOrders,
                ordersByStatus.get(OrderStatus.PENDING.name()),
                ordersByStatus,
                unpaid,
                overdue,
                revenue,
                collected,
                outstanding);
    }

    private long countOrders(OrderStatus status, String ownerEmail) {
        return ownerEmail == null
                ? orderRepository.countByStatus(status)
                : orderRepository.countByStatusAndCreatedByEmailIgnoreCase(status, ownerEmail);
    }

    private long countInvoices(InvoiceStatus status, String ownerEmail) {
        return ownerEmail == null
                ? invoiceRepository.countByStatus(status)
                : invoiceRepository.countByStatusAndOrder_CreatedBy_EmailIgnoreCase(status, ownerEmail);
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(3, RoundingMode.HALF_UP);
    }
}