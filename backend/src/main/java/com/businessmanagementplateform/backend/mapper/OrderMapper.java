package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.OrderItemResponse;
import com.businessmanagementplateform.backend.dto.OrderResponse;
import com.businessmanagementplateform.backend.dto.OrderSummaryResponse;
import com.businessmanagementplateform.backend.entity.Customer;
import com.businessmanagementplateform.backend.entity.Order;
import com.businessmanagementplateform.backend.entity.OrderItem;
import org.springframework.stereotype.Component;

@Component
public class OrderMapper {

    public OrderResponse toResponse(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getCustomer().getId(),
                customerName(order.getCustomer()),
                order.getOrderDate(),
                order.getStatus().name(),
                order.getTotalAmount(),
                order.getCreatedBy().getEmail(),
                order.getItems().stream().map(this::toItemResponse).toList(),
                order.getCreatedAt(),
                order.getUpdatedAt());
    }

    public OrderSummaryResponse toSummary(Order order) {
        return new OrderSummaryResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getCustomer().getId(),
                customerName(order.getCustomer()),
                order.getOrderDate(),
                order.getStatus().name(),
                order.getTotalAmount(),
                order.getCreatedBy().getEmail());
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