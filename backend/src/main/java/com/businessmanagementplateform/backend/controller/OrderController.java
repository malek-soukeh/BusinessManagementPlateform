package com.businessmanagementplateform.backend.controller;

import com.businessmanagementplateform.backend.dto.CreateOrderRequest;
import com.businessmanagementplateform.backend.dto.OrderResponse;
import com.businessmanagementplateform.backend.dto.OrderSummaryResponse;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.enums.OrderStatus;
import com.businessmanagementplateform.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request,
                                Authentication authentication) {
        return orderService.create(request, authentication.getName());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public PageResponse<OrderSummaryResponse> findAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) Long customerId,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        return orderService.findAll(q, status, customerId, ownerFilter(authentication), pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public OrderResponse findById(@PathVariable Long id, Authentication authentication) {
        return orderService.findById(id, ownerFilter(authentication));
    }

    /** ADMIN and MANAGER see every order; an EMPLOYEE only sees the orders he created. */
    private String ownerFilter(Authentication authentication) {
        boolean seesAll = authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_MANAGER"));
        return seesAll ? null : authentication.getName();
    }
}