package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.LoginRequest;
import com.businessmanagementplateform.backend.dto.LoginResponse;
import com.businessmanagementplateform.backend.dto.UserProfileResponse;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.repository.UserRepository;
import com.businessmanagementplateform.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();

        authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        String role = user.getRole().getName().name();

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
}