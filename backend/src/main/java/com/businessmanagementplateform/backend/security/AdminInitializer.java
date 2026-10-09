package com.businessmanagementplateform.backend.config;

import com.businessmanagementplateform.backend.entity.Role;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.enums.RoleType;
import com.businessmanagementplateform.backend.enums.UserStatus;
import com.businessmanagementplateform.backend.repository.RoleRepository;
import com.businessmanagementplateform.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            log.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set: no initial admin account created");
            return;
        }

        String email = adminEmail.trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            log.info("Initial admin account already exists: {}", email);
            return;
        }

        Role adminRole = roleRepository.findByName(RoleType.ADMIN)
                .orElseThrow(() -> new IllegalStateException("ADMIN role not found in database"));

        User admin = User.builder()
                .firstName("System")
                .lastName("Admin")
                .email(email)
                .password(passwordEncoder.encode(adminPassword))
                .status(UserStatus.ACTIVE)
                .role(adminRole)
                .build();

        userRepository.save(admin);
        log.info("Initial admin account created: {}", email);
    }
}