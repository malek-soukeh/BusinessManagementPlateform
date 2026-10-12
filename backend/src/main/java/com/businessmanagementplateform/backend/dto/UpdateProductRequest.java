package com.businessmanagementplateform.backend.dto;

import com.businessmanagementplateform.backend.enums.ProductStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdateProductRequest(
        @NotBlank @Size(max = 50)
        String reference,

        @NotBlank @Size(max = 200)
        String name,

        @Size(max = 2000)
        String description,

        @NotNull @DecimalMin(value = "0.0", inclusive = false) @Digits(integer = 11, fraction = 3)
        BigDecimal purchasePrice,

        @NotNull @DecimalMin(value = "0.0", inclusive = false) @Digits(integer = 11, fraction = 3)
        BigDecimal sellingPrice,

        @NotNull @Min(0)
        Integer minimumStock,

        @NotNull
        Long categoryId,

        ProductStatus status,

        @NotNull
        Long version
) {
}