package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateProductRequest;
import com.businessmanagementplateform.backend.dto.ProductResponse;
import com.businessmanagementplateform.backend.dto.UpdateProductRequest;
import com.businessmanagementplateform.backend.entity.Category;
import com.businessmanagementplateform.backend.entity.Product;
import com.businessmanagementplateform.backend.enums.ProductStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.ProductMapper;
import com.businessmanagementplateform.backend.repository.CategoryRepository;
import com.businessmanagementplateform.backend.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Spy
    private ProductMapper productMapper = new ProductMapper();

    @InjectMocks
    private ProductService productService;

    private Category category() {
        return Category.builder().id(7L).name("Ordinateurs").build();
    }

    private Product product(Long id, String reference, long version, int quantity, int minimumStock) {
        return Product.builder()
                .id(id)
                .reference(reference)
                .name("Laptop Dell")
                .purchasePrice(new BigDecimal("2000.000"))
                .sellingPrice(new BigDecimal("2500.000"))
                .quantity(quantity)
                .minimumStock(minimumStock)
                .category(category())
                .status(ProductStatus.ACTIVE)
                .version(version)
                .build();
    }

    private UpdateProductRequest updateRequest(String reference, ProductStatus status, Long version) {
        return new UpdateProductRequest(reference, "Laptop Dell Latitude", "14 pouces",
                new BigDecimal("2000"), new BigDecimal("2600.5"), 5, 7L, status, version);
    }

    // ---------- create ----------

    @Test
    void create_upperCasesReferenceAndScalesPricesToThreeDecimals() {
        CreateProductRequest request = new CreateProductRequest("pc001", "  Laptop  ", null,
                new BigDecimal("2000"), new BigDecimal("2500.5"), 15, null, 7L);
        when(productRepository.existsByReference("PC001")).thenReturn(false);
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(category()));
        when(productRepository.saveAndFlush(any(Product.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        productService.create(request);

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).saveAndFlush(captor.capture());
        Product saved = captor.getValue();
        assertThat(saved.getReference()).isEqualTo("PC001");
        assertThat(saved.getName()).isEqualTo("Laptop");
        assertThat(saved.getPurchasePrice()).isEqualTo(new BigDecimal("2000.000"));
        assertThat(saved.getSellingPrice()).isEqualTo(new BigDecimal("2500.500"));
        assertThat(saved.getQuantity()).isEqualTo(15);
        assertThat(saved.getMinimumStock()).isZero();
        assertThat(saved.getStatus()).isEqualTo(ProductStatus.ACTIVE);
    }

    @Test
    void create_throwsConflict_whenReferenceAlreadyUsed() {
        CreateProductRequest request = new CreateProductRequest("pc001", "Doublon", null,
                BigDecimal.ONE, BigDecimal.TEN, 1, 0, 7L);
        when(productRepository.existsByReference("PC001")).thenReturn(true);

        assertThatThrownBy(() -> productService.create(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("PC001");
        verify(productRepository, never()).saveAndFlush(any(Product.class));
    }

    @Test
    void create_throwsNotFound_whenCategoryMissing() {
        CreateProductRequest request = new CreateProductRequest("NOCAT", "Sans categorie", null,
                BigDecimal.ONE, BigDecimal.TEN, 1, 0, 99L);
        when(productRepository.existsByReference("NOCAT")).thenReturn(false);
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Category");
    }

    // ---------- update ----------

    @Test
    void update_throwsConflict_whenVersionIsStale() {
        Product existing = product(1L, "PC001", 1L, 15, 5);
        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> productService.update(1L, updateRequest("PC001", null, 0L)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("modified by someone else");
        verify(productRepository, never()).saveAndFlush(any(Product.class));
    }

    @Test
    void update_throwsConflict_whenReferenceBelongsToAnotherProduct() {
        Product existing = product(1L, "MON001", 0L, 20, 5);
        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(productRepository.existsByReferenceAndIdNot("PC001", 1L)).thenReturn(true);

        assertThatThrownBy(() -> productService.update(1L, updateRequest("pc001", null, 0L)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Reference already in use");
    }

    @Test
    void update_neverChangesTheStockQuantity() {
        Product existing = product(1L, "PC001", 0L, 15, 5);
        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(category()));
        when(productRepository.saveAndFlush(any(Product.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = productService.update(1L, updateRequest("pc001", null, 0L));

        assertThat(response.quantity()).isEqualTo(15);
        assertThat(response.name()).isEqualTo("Laptop Dell Latitude");
        assertThat(response.reference()).isEqualTo("PC001");
        assertThat(response.sellingPrice()).isEqualTo(new BigDecimal("2600.500"));
        assertThat(response.status()).isEqualTo("ACTIVE");
    }

    @Test
    void update_canReactivateAnInactiveProduct() {
        Product existing = product(1L, "PC001", 0L, 15, 5);
        existing.setStatus(ProductStatus.INACTIVE);
        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(category()));
        when(productRepository.saveAndFlush(any(Product.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = productService.update(
                1L, updateRequest("PC001", ProductStatus.ACTIVE, 0L));

        assertThat(response.status()).isEqualTo("ACTIVE");
    }

    // ---------- deactivate ----------

    @Test
    void deactivate_setsStatusToInactiveWithoutDeleting() {
        Product existing = product(1L, "PC001", 0L, 15, 5);
        when(productRepository.findById(1L)).thenReturn(Optional.of(existing));

        productService.deactivate(1L);

        assertThat(existing.getStatus()).isEqualTo(ProductStatus.INACTIVE);
        verify(productRepository).saveAndFlush(existing);
        verify(productRepository, never()).delete(any(Product.class));
    }

    // ---------- findById ----------

    @Test
    void findById_flagsLowStockWhenQuantityIsAtOrBelowMinimum() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(product(1L, "A", 0L, 3, 10)));
        when(productRepository.findById(2L)).thenReturn(Optional.of(product(2L, "B", 0L, 10, 10)));
        when(productRepository.findById(3L)).thenReturn(Optional.of(product(3L, "C", 0L, 11, 10)));

        assertThat(productService.findById(1L).lowStock()).isTrue();
        assertThat(productService.findById(2L).lowStock()).isTrue();
        assertThat(productService.findById(3L).lowStock()).isFalse();
    }

    @Test
    void findById_throwsNotFound_whenProductMissing() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }
}