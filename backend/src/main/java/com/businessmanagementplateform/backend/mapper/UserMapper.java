package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.UserResponse;
import com.businessmanagementplateform.backend.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole().getName().name(),
                user.getStatus().name(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}