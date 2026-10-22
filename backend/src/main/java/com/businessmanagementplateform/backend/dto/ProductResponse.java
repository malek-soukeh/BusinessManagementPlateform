package com.businessmanagementplateform.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
        Long id,
        String reference,
        String name,
        String description,
        @Schema(description = "Prix d'achat HT (3 décimales). Donnée de coût : absente de la réponse "
                + "pour un EMPLOYEE, présente pour ADMIN et MANAGER.",
                nullable = true, requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "2000.000")
        @JsonInclude(JsonInclude.Include.NON_NULL)
        BigDecimal purchasePrice,
        BigDecimal sellingPrice,
        Integer quantity,
        Integer minimumStock,
        boolean lowStock,
        Long categoryId,
        String categoryName,
        String status,
        Long version,
        Instant createdAt,
        Instant updatedAt
) {
}
