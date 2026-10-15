package com.businessmanagementplateform.backend.dto;

import com.businessmanagementplateform.backend.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateOrderStatusRequest(
        @NotNull
        OrderStatus status
) {
}