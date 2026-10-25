package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateUserRequest;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.dto.UpdateUserRequest;
import com.businessmanagementplateform.backend.dto.UpdateUserStatusRequest;
import com.businessmanagementplateform.backend.dto.UserResponse;
import com.businessmanagementplateform.backend.entity.Role;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.enums.RoleType;
import com.businessmanagementplateform.backend.enums.UserStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ErrorCode;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.UserMapper;
import com.businessmanagementplateform.backend.repository.RoleRepository;
import com.businessmanagementplateform.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
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
            throw new ConflictException(ErrorCode.EMAIL_ALREADY_USED, "Email already in use: " + email);
        }

        Role role = findRole(request.role());

        User user = User.builder()
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .phone(normalizePhone(request.phone()))
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
        return userMapper.toResponse(getUser(id));
    }

    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request, String currentEmail) {
        User user = getUser(id);
        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByEmailAndIdNot(email, id)) {
            throw new ConflictException(ErrorCode.EMAIL_ALREADY_USED, "Email already in use: " + email);
        }
        if (isSelf(user, currentEmail)) {
            if (!user.getEmail().equalsIgnoreCase(email)) {
                throw new ConflictException(ErrorCode.CANNOT_CHANGE_OWN_EMAIL, "You cannot change your own email");
            }
            if (user.getRole().getName() != request.role()) {
                throw new ConflictException(ErrorCode.CANNOT_CHANGE_OWN_ROLE, "You cannot change your own role");
            }
        }

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPhone(normalizePhone(request.phone()));
        user.setRole(findRole(request.role()));

        return userMapper.toResponse(userRepository.saveAndFlush(user));
    }

    @Transactional
    public UserResponse updateStatus(Long id, UpdateUserStatusRequest request, String currentEmail) {
        User user = getUser(id);

        if (isSelf(user, currentEmail) && request.status() != UserStatus.ACTIVE) {
            throw new ConflictException(ErrorCode.CANNOT_DEACTIVATE_OWN_ACCOUNT, "You cannot deactivate your own account");
        }

        user.setStatus(request.status());
        return userMapper.toResponse(userRepository.saveAndFlush(user));
    }

    @Transactional
    public void delete(Long id, String currentEmail) {
        User user = getUser(id);

        if (isSelf(user, currentEmail)) {
            throw new ConflictException(ErrorCode.CANNOT_DELETE_OWN_ACCOUNT, "You cannot delete your own account");
        }

        try {
            userRepository.delete(user);
            userRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(ErrorCode.USER_HAS_RECORDS,
                    "User is linked to existing records and cannot be deleted: deactivate it instead");
        }
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + id));
    }

    private Role findRole(RoleType roleType) {
        return roleRepository.findByName(roleType)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleType));
    }

    private boolean isSelf(User user, String currentEmail) {
        return user.getEmail().equalsIgnoreCase(currentEmail);
    }

    private String normalizePhone(String phone) {
        return phone == null || phone.isBlank() ? null : phone.trim();
    }
}