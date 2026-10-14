package com.businessmanagementplateform.backend.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdjustStockRequest(
        @NotNull @Min(-1000000) @Max(1000000)
        Integer quantityChange,

        @NotBlank @Size(max = 255)
        String note
) {

    @AssertTrue(message = "must not be zero")
    public boolean isQuantityChangeNonZero() {
        return quantityChange == null || quantityChange != 0;
    }
}