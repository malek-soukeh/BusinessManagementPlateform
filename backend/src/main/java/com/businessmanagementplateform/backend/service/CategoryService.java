package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CategoryRequest;
import com.businessmanagementplateform.backend.dto.CategoryResponse;
import com.businessmanagementplateform.backend.entity.Category;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.CategoryMapper;
import com.businessmanagementplateform.backend.repository.CategoryRepository;
import com.businessmanagementplateform.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CategoryMapper categoryMapper;

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("Category name already in use: " + name);
        }

        Category category = Category.builder()
                .name(name)
                .description(clean(request.description()))
                .parent(findParent(request.parentId()))
                .build();

        return categoryMapper.toResponse(categoryRepository.saveAndFlush(category));
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> findAll() {
        return categoryRepository.findAll(Sort.by("name")).stream()
                .map(categoryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse findById(Long id) {
        return categoryMapper.toResponse(getCategory(id));
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = getCategory(id);
        String name = request.name().trim();

        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ConflictException("Category name already in use: " + name);
        }

        Category parent = findParent(request.parentId());
        checkNoCycle(category, parent);

        category.setName(name);
        category.setDescription(clean(request.description()));
        category.setParent(parent);

        return categoryMapper.toResponse(categoryRepository.saveAndFlush(category));
    }

    @Transactional
    public void delete(Long id) {
        Category category = getCategory(id);

        if (categoryRepository.existsByParentId(id)) {
            throw new ConflictException("Category has sub-categories and cannot be deleted");
        }
        if (productRepository.existsByCategoryId(id)) {
            throw new ConflictException("Category is used by products and cannot be deleted");
        }

        try {
            categoryRepository.delete(category);
            categoryRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Category is in use and cannot be deleted");
        }
    }

    private Category getCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id " + id));
    }

    private Category findParent(Long parentId) {
        if (parentId == null) {
            return null;
        }
        return categoryRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Parent category not found with id " + parentId));
    }

    private void checkNoCycle(Category category, Category newParent) {
        Category current = newParent;
        while (current != null) {
            if (current.getId().equals(category.getId())) {
                throw new ConflictException(
                        "A category cannot be its own parent or a descendant of itself");
            }
            current = current.getParent();
        }
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}