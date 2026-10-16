package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.InvoiceResponse;
import com.businessmanagementplateform.backend.dto.InvoiceSummaryResponse;
import com.businessmanagementplateform.backend.dto.OrderItemResponse;
import com.businessmanagementplateform.backend.entity.Customer;
import com.businessmanagementplateform.backend.entity.Invoice;
import com.businessmanagementplateform.backend.entity.Order;
import com.businessmanagementplateform.backend.entity.OrderItem;
import org.springframework.stereotype.Component;

@Component
public class InvoiceMapper {

    public InvoiceResponse toResponse(Invoice invoice) {
        Order order = invoice.getOrder();
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
                invoice.getStatus().name(),
                invoice.getPaymentStatus().name(),
                order.getItems().stream().map(this::toItemResponse).toList(),
                invoice.getCreatedAt(),
                invoice.getUpdatedAt());
    }

    public InvoiceSummaryResponse toSummary(Invoice invoice) {
        Order order = invoice.getOrder();
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

    private String customerName(Customer customer) {
        return customer.getFirstName() + " " + customer.getLastName();
    }
}