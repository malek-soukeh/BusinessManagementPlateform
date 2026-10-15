package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.AdjustStockRequest;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.dto.StockMovementResponse;
import com.businessmanagementplateform.backend.entity.Product;
import com.businessmanagementplateform.backend.entity.StockMovement;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.enums.StockMovementReason;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.StockMovementMapper;
import com.businessmanagementplateform.backend.repository.ProductRepository;
import com.businessmanagementplateform.backend.repository.StockMovementRepository;
import com.businessmanagementplateform.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    private static final String EMAIL = "admin@techdistrib.tn";

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private UserRepository userRepository;

    @Spy
    private StockMovementMapper stockMovementMapper = new StockMovementMapper();

    @InjectMocks
    private StockService stockService;

    private Product product(int quantity) {
        return Product.builder()
                .id(7L)
                .reference("PC001")
                .name("Laptop Dell")
                .quantity(quantity)
                .build();
    }

    private User admin() {
        return User.builder().id(1L).email(EMAIL).build();
    }

    private void givenProductAndUser(int quantity) {
        when(productRepository.findById(7L)).thenReturn(Optional.of(product(quantity)));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(admin()));
    }

    private ArgumentCaptor<StockMovement> captureSavedMovement() {
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        return captor;
    }

    // ---------- adjust ----------

    @Test
    void adjust_increasesStockAndRecordsAManualMovement() {
        Product existing = product(15);
        when(productRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(admin()));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockMovementResponse response = stockService.adjust(
                7L, new AdjustStockRequest(5, "  Inventaire annuel "), EMAIL);

        assertThat(existing.getQuantity()).isEqualTo(20);
        verify(productRepository).saveAndFlush(existing);
        StockMovement saved = captureSavedMovement().getValue();
        assertThat(saved.getQuantityChange()).isEqualTo(5);
        assertThat(saved.getQuantityAfter()).isEqualTo(20);
        assertThat(saved.getReason()).isEqualTo(StockMovementReason.MANUAL_ADJUSTMENT);
        assertThat(saved.getNote()).isEqualTo("Inventaire annuel");
        assertThat(saved.getCreatedBy().getEmail()).isEqualTo(EMAIL);
        assertThat(response.quantityAfter()).isEqualTo(20);
        assertThat(response.createdBy()).isEqualTo(EMAIL);
    }

    @Test
    void adjust_decreasesStock() {
        Product existing = product(15);
        when(productRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(admin()));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        stockService.adjust(7L, new AdjustStockRequest(-4, "Casse"), EMAIL);

        assertThat(existing.getQuantity()).isEqualTo(11);
        assertThat(captureSavedMovement().getValue().getQuantityChange()).isEqualTo(-4);
    }

    @Test
    void adjust_allowsReachingExactlyZero() {
        Product existing = product(3);
        when(productRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(admin()));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        stockService.adjust(7L, new AdjustStockRequest(-3, "Stock epuise"), EMAIL);

        assertThat(existing.getQuantity()).isZero();
    }

    @Test
    void adjust_throwsConflict_whenStockWouldGoNegative() {
        Product existing = product(3);
        when(productRepository.findById(7L)).thenReturn(Optional.of(existing));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(admin()));

        assertThatThrownBy(() -> stockService.adjust(7L, new AdjustStockRequest(-4, "Trop"), EMAIL))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Insufficient stock");

        assertThat(existing.getQuantity()).isEqualTo(3);
        verify(productRepository, never()).saveAndFlush(any(Product.class));
        verify(stockMovementRepository, never()).save(any(StockMovement.class));
    }

    @Test
    void adjust_throwsNotFound_whenProductMissing() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stockService.adjust(99L, new AdjustStockRequest(1, "x"), EMAIL))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void adjust_throwsNotFound_whenUserMissing() {
        when(productRepository.findById(7L)).thenReturn(Optional.of(product(15)));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stockService.adjust(7L, new AdjustStockRequest(1, "x"), EMAIL))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User");
        verify(stockMovementRepository, never()).save(any(StockMovement.class));
    }

    // ---------- recordInitialStock ----------

    @Test
    void recordInitialStock_writesAnInitialMovementWhenQuantityIsPositive() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(admin()));

        stockService.recordInitialStock(product(15), EMAIL);

        StockMovement saved = captureSavedMovement().getValue();
        assertThat(saved.getReason()).isEqualTo(StockMovementReason.INITIAL_STOCK);
        assertThat(saved.getQuantityChange()).isEqualTo(15);
        assertThat(saved.getQuantityAfter()).isEqualTo(15);
        assertThat(saved.getCreatedBy().getEmail()).isEqualTo(EMAIL);
    }

    @Test
    void recordInitialStock_doesNothingWhenQuantityIsZero() {
        stockService.recordInitialStock(product(0), EMAIL);

        verifyNoInteractions(stockMovementRepository);
        verifyNoInteractions(userRepository);
    }

    // ---------- history ----------

    @Test
    void history_throwsNotFound_whenProductMissing() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stockService.history(99L, PageRequest.of(0, 20)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void history_alwaysSortsNewestFirst_ignoringTheClientSort() {
        when(productRepository.findById(7L)).thenReturn(Optional.of(product(15)));
        Pageable requested = PageRequest.of(2, 10, Sort.by("quantityChange"));
        StockMovement movement = StockMovement.builder()
                .id(5L)
                .product(product(15))
                .quantityChange(5)
                .quantityAfter(20)
                .reason(StockMovementReason.MANUAL_ADJUSTMENT)
                .createdBy(admin())
                .build();
        when(stockMovementRepository.findByProductId(eq(7L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(movement), PageRequest.of(2, 10), 21));

        PageResponse<StockMovementResponse> result = stockService.history(7L, requested);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(stockMovementRepository).findByProductId(eq(7L), captor.capture());
        Pageable used = captor.getValue();
        assertThat(used.getPageNumber()).isEqualTo(2);
        assertThat(used.getPageSize()).isEqualTo(10);
        assertThat(used.getSort())
                .isEqualTo(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        assertThat(result.totalElements()).isEqualTo(21);
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).productReference()).isEqualTo("PC001");
    }
    // ---------- applyOrderMovement ----------

    @Test
    void applyOrderMovement_decreasesStockAndLinksTheMovementToTheOrder() {
        Product existing = product(15);
        User user = admin();

        stockService.applyOrderMovement(existing, -2, StockMovementReason.ORDER_CONFIRMED,
                5L, "Order ORD-2026-00005", user);

        assertThat(existing.getQuantity()).isEqualTo(13);
        verify(productRepository).saveAndFlush(existing);
        StockMovement saved = captureSavedMovement().getValue();
        assertThat(saved.getQuantityChange()).isEqualTo(-2);
        assertThat(saved.getQuantityAfter()).isEqualTo(13);
        assertThat(saved.getReason()).isEqualTo(StockMovementReason.ORDER_CONFIRMED);
        assertThat(saved.getOrderId()).isEqualTo(5L);
        assertThat(saved.getNote()).isEqualTo("Order ORD-2026-00005");
        assertThat(saved.getCreatedBy()).isSameAs(user);
    }

    @Test
    void applyOrderMovement_putsStockBackWhenTheChangeIsPositive() {
        Product existing = product(13);

        stockService.applyOrderMovement(existing, 2, StockMovementReason.ORDER_CANCELLED,
                5L, "Order ORD-2026-00005", admin());

        assertThat(existing.getQuantity()).isEqualTo(15);
        StockMovement saved = captureSavedMovement().getValue();
        assertThat(saved.getReason()).isEqualTo(StockMovementReason.ORDER_CANCELLED);
        assertThat(saved.getQuantityAfter()).isEqualTo(15);
    }

    @Test
    void applyOrderMovement_throwsConflict_whenStockIsInsufficient() {
        Product existing = product(1);

        assertThatThrownBy(() -> stockService.applyOrderMovement(existing, -2,
                StockMovementReason.ORDER_CONFIRMED, 5L, "Order", admin()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Insufficient stock for PC001")
                .hasMessageContaining("available 1, requested 2");

        assertThat(existing.getQuantity()).isEqualTo(1);
        verify(productRepository, never()).saveAndFlush(any(Product.class));
        verify(stockMovementRepository, never()).save(any(StockMovement.class));
    }
}