package com.businessmanagementplateform.backend.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
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

    /** Roles of the management: they see the cost data and decide the status of the customers. */
    private static final Set<String> MANAGEMENT_ROLES = Set.of("ROLE_ADMIN", "ROLE_MANAGER");

    /** Whether the current user may see the purchase prices: ADMIN and MANAGER yes, EMPLOYEE never. */
    public boolean canSeeCosts() {
        return hasAnyAuthority(MANAGEMENT_ROLES);
    }

    /** Whether the current user may activate or deactivate a customer: ADMIN and MANAGER yes, EMPLOYEE never. */
    public boolean canChangeCustomerStatus() {
        return hasAnyAuthority(MANAGEMENT_ROLES);
    }

    /** E-mail of the logged-in user, or null when nobody (or only the anonymous user) is authenticated. */
    public String email() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        return authentication.getName();
    }

    private boolean hasAnyAuthority(Set<String> authorities) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authorities::contains);
    }
}
