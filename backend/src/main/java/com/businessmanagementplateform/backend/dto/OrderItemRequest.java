package com.businessmanagementplateform.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record OrderItemRequest(
        @NotNull
        Long productId,

        @NotNull @Min(1) @Max(100000)
        Integer quantity
) {
}