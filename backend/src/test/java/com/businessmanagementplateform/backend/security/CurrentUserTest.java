package com.businessmanagementplateform.backend.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

class CurrentUserTest {

    private final CurrentUser currentUser = new CurrentUser();

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void logInAs(String role) {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                "user@techdistrib.tn", null, AuthorityUtils.createAuthorityList("ROLE_" + role)));
    }

    @Test
    void administratorsAndManagersSeeTheCosts() {
        logInAs("ADMIN");
        assertThat(currentUser.canSeeCosts()).isTrue();

        logInAs("MANAGER");
        assertThat(currentUser.canSeeCosts()).isTrue();
    }

    @Test
    void employeesNeverSeeTheCosts() {
        logInAs("EMPLOYEE");

        assertThat(currentUser.canSeeCosts()).isFalse();
    }

    @Test
    void nobodySeesTheCostsWithoutAnAuthenticatedUser() {
        assertThat(currentUser.canSeeCosts()).isFalse();

        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
                "key", "anonymous", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));
        assertThat(currentUser.canSeeCosts()).isFalse();
    }
}
