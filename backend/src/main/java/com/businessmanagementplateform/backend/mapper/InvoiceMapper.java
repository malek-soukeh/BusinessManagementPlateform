package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.InvoiceResponse;
import com.businessmanagementplateform.backend.dto.InvoiceSummaryResponse;
import com.businessmanagementplateform.backend.dto.OrderItemResponse;
import com.businessmanagementplateform.backend.entity.Customer;
import com.businessmanagementplateform.backend.entity.Invoice;
import com.businessmanagementplateform.backend.entity.Order;
import com.businessmanagementplateform.backend.entity.OrderItem;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class InvoiceMapper {

    /** @param paidAmount sum of the payments of the invoice (null or zero when it has none) */
    public InvoiceResponse toResponse(Invoice invoice, BigDecimal paidAmount) {
        Order order = invoice.getOrder();
        BigDecimal paid = money(paidAmount);
        return new InvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                order.getId(),
                order.getOrderNumber(),
                order.getCustomer().getId(),
                customerName(order.getCustomer()),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getSubtotal(),
                invoice.getTaxAmount(),
                invoice.getDiscount(),
                invoice.getTotalAmount(),
                paid,
                remaining(invoice, paid),
                invoice.getStatus().name(),
                invoice.getPaymentStatus().name(),
                order.getItems().stream().map(this::toItemResponse).toList(),
                invoice.getCreatedAt(),
                invoice.getUpdatedAt());
    }

    /** @param paidAmount sum of the payments of the invoice (null or zero when it has none) */
    public InvoiceSummaryResponse toSummary(Invoice invoice, BigDecimal paidAmount) {
        Order order = invoice.getOrder();
        BigDecimal paid = money(paidAmount);
        return new InvoiceSummaryResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                order.getId(),
                order.getOrderNumber(),
                order.getCustomer().getId(),
                customerName(order.getCustomer()),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getTotalAmount(),
                paid,
                remaining(invoice, paid),
                invoice.getStatus().name(),
                invoice.getPaymentStatus().name());
    }

    private OrderItemResponse toItemResponse(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getReference(),
                item.getProduct().getName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getSubtotal());
    }

    /** Total minus the payments, never negative; nothing is left to pay on a cancelled invoice. */
    private BigDecimal remaining(Invoice invoice, BigDecimal paid) {
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            return money(BigDecimal.ZERO);
        }
        return money(invoice.getTotalAmount().subtract(paid).max(BigDecimal.ZERO));
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(3, RoundingMode.HALF_UP);
    }

    private String customerName(Customer customer) {
        return customer.getFirstName() + " " + customer.getLastName();
    }
}