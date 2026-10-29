package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.ChangePasswordRequest;
import com.businessmanagementplateform.backend.dto.LoginRequest;
import com.businessmanagementplateform.backend.dto.LoginResponse;
import com.businessmanagementplateform.backend.dto.UserProfileResponse;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ErrorCode;
import com.businessmanagementplateform.backend.repository.UserRepository;
import com.businessmanagementplateform.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String LOGIN_PATH = "/api/auth/login";

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();

        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        } catch (AuthenticationException ex) {
            // Who tried and when, never the password. The login route is public: the user is not known yet.
            auditService.record(new AuditEntry(email, AuditActions.LOGIN_FAILED, "USER", null, null,
                    "POST", LOGIN_PATH, "Invalid credentials or inactive account"));
            throw ex;
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        String role = user.getRole().getName().name();

        auditService.record(new AuditEntry(email, AuditActions.LOGIN, "USER", user.getId(), email,
                "POST", LOGIN_PATH, null));

        String token = jwtService.generateToken(email, role);
        return new LoginResponse(token, "Bearer", jwtService.getExpirationSeconds(), email, role);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        return new UserProfileResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().getName().name(),
                user.getStatus().name());
    }

    /**
     * Changes the password of the logged-in user. The current password is asked again so that a stolen
     * token alone is not enough to take the account over. Refusals are 409 (a business rule), never 401:
     * the frontend would take a 401 for an expired session and log the user out.
     */
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new ConflictException(ErrorCode.INVALID_CURRENT_PASSWORD, "Current password is incorrect");
        }
        if (request.newPassword().equals(request.currentPassword())) {
            throw new ConflictException(ErrorCode.NEW_PASSWORD_SAME_AS_CURRENT,
                    "The new password must be different from the current one");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
