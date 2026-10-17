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
import com.businessmanagementplateform.backend.enums.StockMovementReason;
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
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import com.businessmanagementplateform.backend.repository.InvoiceRepository;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS = Map.of(
            OrderStatus.PENDING, Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.SHIPPED, OrderStatus.CANCELLED),
            OrderStatus.SHIPPED, Set.of(OrderStatus.DELIVERED));

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StockService stockService;
    private final InvoiceRepository invoiceRepository;
    private final OrderMapper orderMapper;

    @Transactional
    public OrderResponse create(CreateOrderRequest request, String userEmail) {
        User user = getUser(userEmail);
        Customer customer = getActiveCustomer(request.customerId());

        Order order = Order.builder()
                .customer(customer)
                .orderDate(Instant.now())
                .status(OrderStatus.PENDING)
                .createdBy(user)
                .build();

        order.setTotalAmount(fillItems(order, request.items()));
        order.setOrderNumber(nextOrderNumber());

        return orderMapper.toResponse(orderRepository.saveAndFlush(order));
    }

    @Transactional
    public OrderResponse update(Long id, CreateOrderRequest request) {
        Order order = getOrderForUpdate(id);
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new ConflictException(
                    "Only PENDING orders can be modified, current status: " + order.getStatus());
        }

        Customer customer = getActiveCustomer(request.customerId());

        // Deletes must reach the database before the new rows are inserted (unique order/product).
        order.getItems().clear();
        orderRepository.flush();

        order.setCustomer(customer);
        order.setTotalAmount(fillItems(order, request.items()));

        return orderMapper.toResponse(orderRepository.saveAndFlush(order));
    }

    @Transactional
    public OrderResponse changeStatus(Long id, OrderStatus newStatus, String userEmail) {
        Order order = getOrderForUpdate(id);
        OrderStatus current = order.getStatus();

        if (!ALLOWED_TRANSITIONS.getOrDefault(current, Set.of()).contains(newStatus)) {
            throw new ConflictException(
                    "Cannot change order status from " + current + " to " + newStatus);
        }

        if (newStatus == OrderStatus.CONFIRMED) {
            moveStock(order, userEmail, -1, StockMovementReason.ORDER_CONFIRMED);
        } else if (newStatus == OrderStatus.CANCELLED && current == OrderStatus.CONFIRMED) {
            if (invoiceRepository.existsByOrderIdAndStatusNot(order.getId(), InvoiceStatus.CANCELLED)) {
                throw new ConflictException("Cannot cancel order " + order.getOrderNumber()
                        + ": it has an active invoice, cancel the invoice first");
            }
            moveStock(order, userEmail, 1, StockMovementReason.ORDER_CANCELLED);
        }

        order.setStatus(newStatus);
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

    /** Validates the requested lines, adds them to the order and returns the order total. */
    private BigDecimal fillItems(Order order, List<OrderItemRequest> requested) {
        Set<Long> productIds = new HashSet<>();
        for (OrderItemRequest item : requested) {
            if (!productIds.add(item.productId())) {
                throw new ConflictException(
                        "Product appears more than once in the order: " + item.productId());
            }
        }

        BigDecimal total = BigDecimal.ZERO;
        for (OrderItemRequest item : requested) {
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
        return total;
    }

    /** Locks the products in ascending id order, then applies one stock movement per order line. */
    private void moveStock(Order order, String userEmail, int sign, StockMovementReason reason) {
        User user = getUser(userEmail);

        List<Long> productIds = order.getItems().stream()
                .map(item -> item.getProduct().getId())
                .sorted()
                .toList();
        Map<Long, Product> lockedProducts = productRepository.findAllByIdForUpdate(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        for (OrderItem item : order.getItems()) {
            Product product = lockedProducts.get(item.getProduct().getId());
            stockService.applyOrderMovement(product, sign * item.getQuantity(), reason,
                    order.getId(), "Order " + order.getOrderNumber(), user);
        }
    }

    private Order getOrderForUpdate(Long id) {
        return orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id " + id));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Customer getActiveCustomer(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id " + id));
        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw new ConflictException("Customer is inactive: " + customer.getId());
        }
        return customer;
    }

    private String nextOrderNumber() {
        return String.format("ORD-%d-%05d", Year.now().getValue(), orderRepository.nextOrderSequence());
    }
}