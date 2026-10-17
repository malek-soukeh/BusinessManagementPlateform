package com.businessmanagementplateform.backend.controller;

import com.businessmanagementplateform.backend.dto.DashboardStatsResponse;
import com.businessmanagementplateform.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public DashboardStatsResponse stats(Authentication authentication) {
        return dashboardService.getStats(ownerFilter(authentication));
    }

    /** ADMIN and MANAGER get global figures; an EMPLOYEE only sees figures about his own orders. */
    private String ownerFilter(Authentication authentication) {
        boolean seesAll = authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_MANAGER"));
        return seesAll ? null : authentication.getName();
    }
}