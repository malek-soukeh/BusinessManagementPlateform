package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateProductRequest;
import com.businessmanagementplateform.backend.dto.PageResponse;
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
import com.businessmanagementplateform.backend.repository.ProductSpecifications;
import com.businessmanagementplateform.backend.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductMapper productMapper;
    private final StockService stockService;
    private final CurrentUser currentUser;
    @Transactional
    public ProductResponse create(CreateProductRequest request, String userEmail) {
        String reference = normalizeReference(request.reference());
        if (productRepository.existsByReference(reference)) {
            throw new ConflictException("Reference already in use: " + reference);
        }

        Product product = Product.builder()
                .reference(reference)
                .name(request.name().trim())
                .description(clean(request.description()))
                .purchasePrice(money(request.purchasePrice()))
                .sellingPrice(money(request.sellingPrice()))
                .quantity(request.quantity())
                .minimumStock(request.minimumStock() == null ? 0 : request.minimumStock())
                .category(getCategory(request.categoryId()))
                .status(ProductStatus.ACTIVE)
                .build();

        Product saved = productRepository.saveAndFlush(product);
        stockService.recordInitialStock(saved, userEmail);
        return toResponse(saved);    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> findAll(String q, Long categoryId, ProductStatus status,
                                                 Boolean lowStock, Pageable pageable) {
        return PageResponse.from(
                productRepository.findAll(
                                ProductSpecifications.search(q, categoryId, status, lowStock), pageable)
                        .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public ProductResponse findById(Long id) {
        return toResponse(getProduct(id));
    }

    @Transactional
    public ProductResponse update(Long id, UpdateProductRequest request) {
        Product product = getProduct(id);

        if (!product.getVersion().equals(request.version())) {
            throw new ConflictException(
                    "Product was modified by someone else: reload it and try again");
        }

        String reference = normalizeReference(request.reference());
        if (productRepository.existsByReferenceAndIdNot(reference, id)) {
            throw new ConflictException("Reference already in use: " + reference);
        }

        product.setReference(reference);
        product.setName(request.name().trim());
        product.setDescription(clean(request.description()));
        product.setPurchasePrice(money(request.purchasePrice()));
        product.setSellingPrice(money(request.sellingPrice()));
        product.setMinimumStock(request.minimumStock());
        product.setCategory(getCategory(request.categoryId()));
        if (request.status() != null) {
            product.setStatus(request.status());
        }

        return toResponse(productRepository.saveAndFlush(product));
    }

    @Transactional
    public void deactivate(Long id) {
        Product product = getProduct(id);
        product.setStatus(ProductStatus.INACTIVE);
        productRepository.saveAndFlush(product);
    }

    /** Every product response goes through here: the purchase price is only given to the roles allowed to see costs. */
    private ProductResponse toResponse(Product product) {
        return productMapper.toResponse(product, currentUser.canSeeCosts());
    }

    private Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + id));
    }

    private Category getCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id " + id));
    }

    private String normalizeReference(String reference) {
        return reference.trim().toUpperCase(Locale.ROOT);
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(3, RoundingMode.HALF_UP);
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}