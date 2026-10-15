package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateOrderRequest;
import com.businessmanagementplateform.backend.dto.OrderItemRequest;
import com.businessmanagementplateform.backend.dto.OrderResponse;
import com.businessmanagementplateform.backend.dto.OrderSummaryResponse;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.entity.Customer;
import com.businessmanagementplateform.backend.entity.Order;
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
import com.businessmanagementplateform.backend.repository.ProductRepository;
import com.businessmanagementplateform.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    private static final String EMAIL = "admin@techdistrib.tn";

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Spy
    private OrderMapper orderMapper = new OrderMapper();

    @InjectMocks
    private OrderService orderService;

    private User user() {
        return User.builder().id(1L).email(EMAIL).build();
    }

    private Customer customer(CustomerStatus status) {
        return Customer.builder().id(3L).firstName("Ahmed").lastName("Ben Ali")
                .email("ahmed@email.com").status(status).build();
    }

    private Product product(Long id, String reference, int quantity, String price, ProductStatus status) {
        return Product.builder().id(id).reference(reference).name("Produit " + reference)
                .quantity(quantity).sellingPrice(new BigDecimal(price)).status(status).build();
    }

    private CreateOrderRequest request(OrderItemRequest... items) {
        return new CreateOrderRequest(3L, List.of(items));
    }

    private void givenUserAndCustomer(CustomerStatus status) {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user()));
        when(customerRepository.findById(3L)).thenReturn(Optional.of(customer(status)));
    }

    // ---------- create ----------

    @Test
    void create_computesSubtotalsAndTotalAndFreezesTheSellingPrices() {
        givenUserAndCustomer(CustomerStatus.ACTIVE);
        when(productRepository.findById(7L))
                .thenReturn(Optional.of(product(7L, "PC001", 15, "2500.000", ProductStatus.ACTIVE)));
        when(productRepository.findById(8L))
                .thenReturn(Optional.of(product(8L, "MON001", 20, "700.500", ProductStatus.ACTIVE)));
        when(orderRepository.nextOrderSequence()).thenReturn(42L);
        when(orderRepository.saveAndFlush(any(Order.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.create(
                request(new OrderItemRequest(7L, 2), new OrderItemRequest(8L, 3)), EMAIL);

        assertThat(response.orderNumber()).matches("ORD-\\d{4}-00042");
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.customerName()).isEqualTo("Ahmed Ben Ali");
        assertThat(response.createdBy()).isEqualTo(EMAIL);
        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).unitPrice()).isEqualByComparingTo("2500.000");
        assertThat(response.items().get(0).subtotal()).isEqualByComparingTo("5000.000");
        assertThat(response.items().get(1).subtotal()).isEqualByComparingTo("2101.500");
        assertThat(response.totalAmount()).isEqualByComparingTo("7101.500");
    }

    @Test
    void create_doesNotTouchTheStock() {
        givenUserAndCustomer(CustomerStatus.ACTIVE);
        Product laptop = product(7L, "PC001", 15, "2500.000", ProductStatus.ACTIVE);
        when(productRepository.findById(7L)).thenReturn(Optional.of(laptop));
        when(orderRepository.nextOrderSequence()).thenReturn(1L);
        when(orderRepository.saveAndFlush(any(Order.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        orderService.create(request(new OrderItemRequest(7L, 5)), EMAIL);

        assertThat(laptop.getQuantity()).isEqualTo(15);
        verify(productRepository, never()).saveAndFlush(any(Product.class));
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void create_throwsNotFound_whenCustomerMissing() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user()));
        when(customerRepository.findById(3L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.create(request(new OrderItemRequest(7L, 1)), EMAIL))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Customer");
    }

    @Test
    void create_throwsConflict_whenCustomerIsInactive() {
        givenUserAndCustomer(CustomerStatus.INACTIVE);

        assertThatThrownBy(() -> orderService.create(request(new OrderItemRequest(7L, 1)), EMAIL))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Customer is inactive");
        verify(orderRepository, never()).saveAndFlush(any(Order.class));
    }

    @Test
    void create_throwsConflict_whenTheSameProductAppearsTwice() {
        givenUserAndCustomer(CustomerStatus.ACTIVE);

        assertThatThrownBy(() -> orderService.create(
                request(new OrderItemRequest(7L, 1), new OrderItemRequest(7L, 2)), EMAIL))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("more than once");
    }

    @Test
    void create_throwsNotFound_whenProductMissing() {
        givenUserAndCustomer(CustomerStatus.ACTIVE);
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.create(request(new OrderItemRequest(99L, 1)), EMAIL))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Product");
    }

    @Test
    void create_throwsConflict_whenProductIsInactive() {
        givenUserAndCustomer(CustomerStatus.ACTIVE);
        when(productRepository.findById(7L))
                .thenReturn(Optional.of(product(7L, "PC001", 15, "2500.000", ProductStatus.INACTIVE)));

        assertThatThrownBy(() -> orderService.create(request(new OrderItemRequest(7L, 1)), EMAIL))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Product is inactive");
    }

    @Test
    void create_throwsConflict_whenStockIsInsufficient() {
        givenUserAndCustomer(CustomerStatus.ACTIVE);
        when(productRepository.findById(7L))
                .thenReturn(Optional.of(product(7L, "PC001", 3, "2500.000", ProductStatus.ACTIVE)));

        assertThatThrownBy(() -> orderService.create(request(new OrderItemRequest(7L, 4)), EMAIL))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Insufficient stock for PC001")
                .hasMessageContaining("available 3, requested 4");
        verify(orderRepository, never()).nextOrderSequence();
        verify(orderRepository, never()).saveAndFlush(any(Order.class));
    }

    // ---------- findById / findAll ----------

    private Order existingOrder() {
        return Order.builder().id(5L).orderNumber("ORD-2026-00005").customer(customer(CustomerStatus.ACTIVE))
                .orderDate(Instant.now()).status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("100.000")).createdBy(user()).build();
    }

    @Test
    void findById_hidesOrdersOfOtherUsers_whenAccessIsRestricted() {
        when(orderRepository.findById(5L)).thenReturn(Optional.of(existingOrder()));

        assertThat(orderService.findById(5L, EMAIL).orderNumber()).isEqualTo("ORD-2026-00005");
        assertThat(orderService.findById(5L, "ADMIN@techdistrib.tn").id()).isEqualTo(5L);
        assertThat(orderService.findById(5L, null).id()).isEqualTo(5L);
        assertThatThrownBy(() -> orderService.findById(5L, "other@techdistrib.tn"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("5");
    }

    @Test
    void findAll_returnsAPageOfSummaries() {
        Pageable pageable = PageRequest.of(0, 20);
        when(orderRepository.findAll(ArgumentMatchers.<Specification<Order>>any(), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(existingOrder()), pageable, 1));

        PageResponse<OrderSummaryResponse> result =
                orderService.findAll("ORD", OrderStatus.PENDING, 3L, null, pageable);

        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.content().get(0).orderNumber()).isEqualTo("ORD-2026-00005");
        assertThat(result.content().get(0).status()).isEqualTo("PENDING");
    }
}