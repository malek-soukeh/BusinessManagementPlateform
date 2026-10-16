package com.businessmanagementplateform.backend.controller;

import com.businessmanagementplateform.backend.dto.CreateInvoiceRequest;
import com.businessmanagementplateform.backend.dto.InvoiceResponse;
import com.businessmanagementplateform.backend.dto.InvoiceSummaryResponse;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import com.businessmanagementplateform.backend.enums.PaymentStatus;
import com.businessmanagementplateform.backend.service.InvoiceService;
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
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public InvoiceResponse generate(@Valid @RequestBody CreateInvoiceRequest request) {
        return invoiceService.generate(request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public PageResponse<InvoiceSummaryResponse> findAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) PaymentStatus paymentStatus,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication) {
        return invoiceService.findAll(q, status, paymentStatus, ownerFilter(authentication), pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public InvoiceResponse findById(@PathVariable Long id, Authentication authentication) {
        return invoiceService.findById(id, ownerFilter(authentication));
    }

    /** ADMIN and MANAGER see every invoice; an EMPLOYEE only sees invoices of orders he created. */
    private String ownerFilter(Authentication authentication) {
        boolean seesAll = authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_MANAGER"));
        return seesAll ? null : authentication.getName();
    }
}