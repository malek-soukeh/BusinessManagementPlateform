package com.businessmanagementplateform.backend.controller;

import com.businessmanagementplateform.backend.dto.AdjustStockRequest;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.dto.StockMovementResponse;
import com.businessmanagementplateform.backend.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products/{productId}")
@RequiredArgsConstructor
public class InventoryController {

    private final StockService stockService;

    @PostMapping("/stock-adjustments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public StockMovementResponse adjust(@PathVariable Long productId,
                                        @Valid @RequestBody AdjustStockRequest request,
                                        Authentication authentication) {
        return stockService.adjust(productId, request, authentication.getName());
    }

    @GetMapping("/stock-movements")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public PageResponse<StockMovementResponse> history(
            @PathVariable Long productId,
            @PageableDefault(size = 20) Pageable pageable) {
        return stockService.history(productId, pageable);
    }
}