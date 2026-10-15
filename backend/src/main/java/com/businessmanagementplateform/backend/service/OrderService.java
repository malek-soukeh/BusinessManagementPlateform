package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateOrderRequest;
import com.businessmanagementplateform.backend.dto.OrderItemRequest;
import com.businessmanagementplateform.backend.dto.OrderResponse;
import com.businessmanagementplateform.backend.dto.OrderSummaryResponse;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.entity.Customer;
import com.businessmanagementplateform.backend.entity.Order;
import com.businessmanagementplateform.backend.entity.OrderItem;
import com.businessmanagementplateform.backend.entity.Product;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.enums.CustomerStatus;
import com.businessmanagementplateform.backend.enums.OrderStatus;
import com.businessmanagementplateform.backend.enums.ProductStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.OrderMapper;
import com.businessmanagementplateform.backend.repository.CustomerRepository;
import com.businessmanagementplateform.backend.repository.OrderRepository;
import com.businessmanagementplateform.backend.repository.OrderSpecifications;
import com.businessmanagementplateform.backend.repository.ProductRepository;
import com.businessmanagementplateform.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.Year;
import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderMapper orderMapper;

    @Transactional
    public OrderResponse create(CreateOrderRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Customer not found with id " + request.customerId()));
        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw new ConflictException("Customer is inactive: " + customer.getId());
        }

        Set<Long> productIds = new HashSet<>();
        for (OrderItemRequest item : request.items()) {
            if (!productIds.add(item.productId())) {
                throw new ConflictException(
                        "Product appears more than once in the order: " + item.productId());
            }
        }

        Order order = Order.builder()
                .customer(customer)
                .orderDate(Instant.now())
                .status(OrderStatus.PENDING)
                .createdBy(user)
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (OrderItemRequest item : request.items()) {
            Product product = productRepository.findById(item.productId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product not found with id " + item.productId()));
            if (product.getStatus() != ProductStatus.ACTIVE) {
                throw new ConflictException("Product is inactive: " + product.getReference());
            }
            if (item.quantity() > product.getQuantity()) {
                throw new ConflictException("Insufficient stock for " + product.getReference()
                        + ": available " + product.getQuantity() + ", requested " + item.quantity());
            }

            BigDecimal unitPrice = product.getSellingPrice();
            BigDecimal subtotal = unitPrice
                    .multiply(BigDecimal.valueOf(item.quantity()))
                    .setScale(3, RoundingMode.HALF_UP);

            order.addItem(OrderItem.builder()
                    .product(product)
                    .quantity(item.quantity())
                    .unitPrice(unitPrice)
                    .subtotal(subtotal)
                    .build());
            total = total.add(subtotal);
        }

        order.setTotalAmount(total);
        order.setOrderNumber(nextOrderNumber());

        return orderMapper.toResponse(orderRepository.saveAndFlush(order));
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> findAll(String q, OrderStatus status, Long customerId,
                                                      String ownerEmail, Pageable pageable) {
        return PageResponse.from(
                orderRepository.findAll(
                                OrderSpecifications.search(q, status, customerId, ownerEmail), pageable)
                        .map(orderMapper::toSummary));
    }

    @Transactional(readOnly = true)
    public OrderResponse findById(Long id, String ownerEmail) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id " + id));

        if (ownerEmail != null && !order.getCreatedBy().getEmail().equalsIgnoreCase(ownerEmail)) {
            throw new ResourceNotFoundException("Order not found with id " + id);
        }
        return orderMapper.toResponse(order);
    }

    private String nextOrderNumber() {
        return String.format("ORD-%d-%05d", Year.now().getValue(), orderRepository.nextOrderSequence());
    }
}