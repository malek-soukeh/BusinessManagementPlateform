package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CategoryRequest;
import com.businessmanagementplateform.backend.dto.CategoryResponse;
import com.businessmanagementplateform.backend.entity.Category;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.CategoryMapper;
import com.businessmanagementplateform.backend.repository.CategoryRepository;
import com.businessmanagementplateform.backend.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductRepository productRepository;

    @Spy
    private CategoryMapper categoryMapper = new CategoryMapper();

    @InjectMocks
    private CategoryService categoryService;

    private Category category(Long id, String name, Category parent) {
        return Category.builder().id(id).name(name).parent(parent).build();
    }

    // ---------- create ----------

    @Test
    void create_trimsNameLinksParentAndTurnsBlankDescriptionIntoNull() {
        Category informatique = category(4L, "Informatique", null);
        when(categoryRepository.findById(4L)).thenReturn(Optional.of(informatique));
        when(categoryRepository.saveAndFlush(any(Category.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CategoryResponse response = categoryService.create(new CategoryRequest("  Ecrans ", "  ", 4L));

        assertThat(response.name()).isEqualTo("Ecrans");
        assertThat(response.description()).isNull();
        assertThat(response.parentId()).isEqualTo(4L);
        assertThat(response.parentName()).isEqualTo("Informatique");
    }

    @Test
    void create_throwsConflict_whenNameAlreadyUsedIgnoringCase() {
        when(categoryRepository.existsByNameIgnoreCase("informatique")).thenReturn(true);

        assertThatThrownBy(() -> categoryService.create(new CategoryRequest("informatique", null, null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Category name already in use");
        verify(categoryRepository, never()).saveAndFlush(any(Category.class));
    }

    @Test
    void create_throwsNotFound_whenParentMissing() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.create(new CategoryRequest("Autre", null, 99L)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Parent category");
    }

    // ---------- update ----------

    @Test
    void update_throwsConflict_whenNameBelongsToAnotherCategory() {
        when(categoryRepository.findById(5L)).thenReturn(Optional.of(category(5L, "Reseau", null)));
        when(categoryRepository.existsByNameIgnoreCaseAndIdNot("Informatique", 5L)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.update(5L, new CategoryRequest("Informatique", null, null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Category name already in use");
    }

    @Test
    void update_rejectsCategoryAsItsOwnParent() {
        Category informatique = category(4L, "Informatique", null);
        when(categoryRepository.findById(4L)).thenReturn(Optional.of(informatique));

        assertThatThrownBy(() -> categoryService.update(4L, new CategoryRequest("Informatique", null, 4L)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("its own parent or a descendant");
        verify(categoryRepository, never()).saveAndFlush(any(Category.class));
    }

    @Test
    void update_rejectsMovingACategoryUnderOneOfItsDescendants() {
        Category informatique = category(4L, "Informatique", null);
        Category ecrans = category(7L, "Ecrans", informatique);
        when(categoryRepository.findById(4L)).thenReturn(Optional.of(informatique));
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(ecrans));

        assertThatThrownBy(() -> categoryService.update(4L, new CategoryRequest("Informatique", null, 7L)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("its own parent or a descendant");
        verify(categoryRepository, never()).saveAndFlush(any(Category.class));
    }

    @Test
    void update_allowsMovingACategoryUnderAnotherBranch() {
        Category informatique = category(4L, "Informatique", null);
        Category reseau = category(5L, "Reseau", null);
        Category ecrans = category(7L, "Ecrans", informatique);
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(ecrans));
        when(categoryRepository.findById(5L)).thenReturn(Optional.of(reseau));
        when(categoryRepository.saveAndFlush(any(Category.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CategoryResponse response = categoryService.update(7L, new CategoryRequest("Ecrans", null, 5L));

        assertThat(response.parentId()).isEqualTo(5L);
        assertThat(response.parentName()).isEqualTo("Reseau");
    }

    @Test
    void update_allowsTurningACategoryIntoARootCategory() {
        Category informatique = category(4L, "Informatique", null);
        Category ecrans = category(7L, "Ecrans", informatique);
        when(categoryRepository.findById(7L)).thenReturn(Optional.of(ecrans));
        when(categoryRepository.saveAndFlush(any(Category.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CategoryResponse response = categoryService.update(7L, new CategoryRequest("Ecrans", null, null));

        assertThat(response.parentId()).isNull();
        assertThat(response.parentName()).isNull();
    }

    // ---------- delete ----------

    @Test
    void delete_throwsConflict_whenCategoryHasSubCategories() {
        when(categoryRepository.findById(4L)).thenReturn(Optional.of(category(4L, "Informatique", null)));
        when(categoryRepository.existsByParentId(4L)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.delete(4L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("sub-categories");
        verify(categoryRepository, never()).delete(any(Category.class));
    }

    @Test
    void delete_throwsConflict_whenCategoryIsUsedByProducts() {
        when(categoryRepository.findById(6L)).thenReturn(Optional.of(category(6L, "Temp", null)));
        when(productRepository.existsByCategoryId(6L)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.delete(6L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("used by products");
        verify(categoryRepository, never()).delete(any(Category.class));
    }

    @Test
    void delete_removesAnUnusedCategory() {
        Category temp = category(6L, "Temp", null);
        when(categoryRepository.findById(6L)).thenReturn(Optional.of(temp));

        categoryService.delete(6L);

        verify(categoryRepository).delete(temp);
        verify(categoryRepository).flush();
    }

    @Test
    void delete_translatesIntegrityViolationIntoConflict() {
        Category temp = category(6L, "Temp", null);
        when(categoryRepository.findById(6L)).thenReturn(Optional.of(temp));
        doThrow(new DataIntegrityViolationException("fk violation")).when(categoryRepository).flush();

        assertThatThrownBy(() -> categoryService.delete(6L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("in use");
    }

    // ---------- findAll / findById ----------

    @Test
    void findAll_returnsCategoriesSortedByName() {
        when(categoryRepository.findAll(Sort.by("name")))
                .thenReturn(List.of(category(7L, "Ecrans", null), category(4L, "Informatique", null)));

        List<CategoryResponse> result = categoryService.findAll();

        assertThat(result).extracting(CategoryResponse::name).containsExactly("Ecrans", "Informatique");
    }

    @Test
    void findById_throwsNotFound_whenCategoryMissing() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }
}
