package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.StockMovementResponse;
import com.businessmanagementplateform.backend.entity.StockMovement;
import org.springframework.stereotype.Component;

@Component
public class StockMovementMapper {

    public StockMovementResponse toResponse(StockMovement movement) {
        return new StockMovementResponse(
                movement.getId(),
                movement.getProduct().getId(),
                movement.getProduct().getReference(),
                movement.getProduct().getName(),
                movement.getQuantityChange(),
                movement.getQuantityAfter(),
                movement.getReason().name(),
                movement.getOrderId(),
                movement.getNote(),
                movement.getCreatedBy().getEmail(),
                movement.getCreatedAt());
    }
}