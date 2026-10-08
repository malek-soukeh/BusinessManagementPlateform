package com.businessmanagementplateform.backend.entity;

import com.businessmanagementplateform.backend.enums.ProductStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String reference;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "purchase_price", nullable = false, precision = 14, scale = 3)
    private BigDecimal purchasePrice;

    @Column(name = "selling_price", nullable = false, precision = 14, scale = 3)
    private BigDecimal sellingPrice;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 0;

    @Column(name = "minimum_stock", nullable = false)
    @Builder.Default
    private Integer minimumStock = 0;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ProductStatus status = ProductStatus.ACTIVE;

    @Version
    @Column(nullable = false)
    private Long version;
}