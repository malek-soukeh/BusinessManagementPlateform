package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.ProductResponse;
import com.businessmanagementplateform.backend.entity.Product;
import org.springframework.stereotype.Component;

@Component
public class ProductMapper {

    /**
     * @param includeCost whether the purchase price is part of the response; when false it is left null
     *                    and omitted from the JSON (see {@code CurrentUser#canSeeCosts()}).
     */
    public ProductResponse toResponse(Product product, boolean includeCost) {
        return new ProductResponse(
                product.getId(),
                product.getReference(),
                product.getName(),
                product.getDescription(),
                includeCost ? product.getPurchasePrice() : null,
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