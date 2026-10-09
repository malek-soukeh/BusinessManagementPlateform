package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateUserRequest;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.dto.UserResponse;
import com.businessmanagementplateform.backend.entity.Role;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.enums.UserStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.UserMapper;
import com.businessmanagementplateform.backend.repository.RoleRepository;
import com.businessmanagementplateform.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Email already in use: " + email);
        }

        Role role = roleRepository.findByName(request.role())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + request.role()));

        String phone = request.phone() == null || request.phone().isBlank()
                ? null
                : request.phone().trim();

        User user = User.builder()
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .phone(phone)
                .status(UserStatus.ACTIVE)
                .role(role)
                .build();

        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> findAll(Pageable pageable) {
        return PageResponse.from(userRepository.findAll(pageable).map(userMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + id));
        return userMapper.toResponse(user);
    }
}