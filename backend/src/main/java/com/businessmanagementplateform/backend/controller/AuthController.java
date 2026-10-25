package com.businessmanagementplateform.backend.controller;

import com.businessmanagementplateform.backend.dto.ChangePasswordRequest;
import com.businessmanagementplateform.backend.dto.LoginRequest;
import com.businessmanagementplateform.backend.dto.LoginResponse;
import com.businessmanagementplateform.backend.dto.UserProfileResponse;
import com.businessmanagementplateform.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserProfileResponse me(Authentication authentication) {
        return authService.getProfile(authentication.getName());
    }

    /** Any logged-in user changes his own password (the route is not public: the token identifies him). */
    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(authentication.getName(), request);
    }
}
