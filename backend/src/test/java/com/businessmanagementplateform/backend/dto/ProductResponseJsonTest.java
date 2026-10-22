package com.businessmanagementplateform.backend.dto;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/** The purchase price hidden from an employee must not even appear as a key in the JSON. */
class ProductResponseJsonTest {

    private final JsonMapper mapper = JsonMapper.builder().build();

    private ProductResponse response(BigDecimal purchasePrice) {
        return new ProductResponse(1L, "PC001", "Laptop", null, purchasePrice, new BigDecimal("2500.000"),
                5, 1, false, 7L, "Ordinateurs", "ACTIVE", 0L, Instant.EPOCH, Instant.EPOCH);
    }

    @Test
    void omitsThePurchasePrice_whenItIsHidden() {
        String json = mapper.writeValueAsString(response(null));

        assertThat(json).doesNotContain("purchasePrice").contains("\"sellingPrice\"");
    }

    @Test
    void writesThePurchasePrice_whenItIsGiven() {
        String json = mapper.writeValueAsString(response(new BigDecimal("2000.000")));

        assertThat(json).contains("\"purchasePrice\":2000.000");
    }

    @Test
    void keepsTheOtherNullFields() {
        String json = mapper.writeValueAsString(response(null));

        assertThat(json).contains("\"description\":null");
    }
}
