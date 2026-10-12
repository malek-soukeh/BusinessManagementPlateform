package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.ProductResponse;
import com.businessmanagementplateform.backend.entity.Product;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    public ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getReference(),
                product.getName(),
                product.getDescription(),
                product.getPurchasePrice(),
                product.getSellingPrice(),
                product.getQuantity(),
                product.getMinimumStock(),
                product.getQuantity() <= product.getMinimumStock(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getStatus().name(),
                product.getVersion(),
                product.getCreatedAt(),
                product.getUpdatedAt());
    }
}