package com.businessmanagementplateform.backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Rights of the user of the current request that change the content of a response
 * (not only the access to an endpoint, which @PreAuthorize already decides).
 * Kept in one place so that services, not controllers, apply them.
 */
@Component
public class CurrentUser {

    /** Roles allowed to see cost data (purchase prices, margins). */
    private static final Set<String> COST_ROLES = Set.of("ROLE_ADMIN", "ROLE_MANAGER");

    /** Whether the current user may see the purchase prices: ADMIN and MANAGER yes, EMPLOYEE never. */
    public boolean canSeeCosts() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(COST_ROLES::contains);
    }
}
