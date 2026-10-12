package com.businessmanagementplateform.backend.mapper;

import com.businessmanagementplateform.backend.dto.CategoryResponse;
import com.businessmanagementplateform.backend.entity.Category;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

    public CategoryResponse toResponse(Category category) {
        Category parent = category.getParent();
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getDescription(),
                parent != null ? parent.getId() : null,
                parent != null ? parent.getName() : null,
                category.getCreatedAt(),
                category.getUpdatedAt());
    }
}