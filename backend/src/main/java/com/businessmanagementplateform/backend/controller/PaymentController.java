package com.businessmanagementplateform.backend.controller;

import com.businessmanagementplateform.backend.dto.CreatePaymentRequest;
import com.businessmanagementplateform.backend.dto.PaymentResponse;
import com.businessmanagementplateform.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

import java.util.List;

@RestController
@RequestMapping("/api/invoices/{invoiceId}/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public PaymentResponse record(@PathVariable Long invoiceId,
                                  @Valid @RequestBody CreatePaymentRequest request,
                                  Authentication authentication) {
        return paymentService.record(invoiceId, request, authentication.getName());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public List<PaymentResponse> findByInvoice(@PathVariable Long invoiceId,
                                               Authentication authentication) {
        return paymentService.findByInvoice(invoiceId, ownerFilter(authentication));
    }

    /** ADMIN and MANAGER see every payment; an EMPLOYEE only those of invoices of his own orders. */
    private String ownerFilter(Authentication authentication) {
        boolean seesAll = authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_MANAGER"));
        return seesAll ? null : authentication.getName();
    }
}