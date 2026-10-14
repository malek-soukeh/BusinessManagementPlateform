package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.AdjustStockRequest;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.dto.StockMovementResponse;
import com.businessmanagementplateform.backend.entity.Product;
import com.businessmanagementplateform.backend.entity.StockMovement;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.enums.StockMovementReason;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.StockMovementMapper;
import com.businessmanagementplateform.backend.repository.ProductRepository;
import com.businessmanagementplateform.backend.repository.StockMovementRepository;
import com.businessmanagementplateform.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StockService {

    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;
    private final StockMovementMapper stockMovementMapper;

    @Transactional
    public StockMovementResponse adjust(Long productId, AdjustStockRequest request, String userEmail) {
        Product product = getProduct(productId);
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        int newQuantity = product.getQuantity() + request.quantityChange();
        if (newQuantity < 0) {
            throw new ConflictException("Insufficient stock: available " + product.getQuantity()
                    + ", requested change " + request.quantityChange());
        }

        product.setQuantity(newQuantity);
        productRepository.saveAndFlush(product);

        StockMovement movement = StockMovement.builder()
                .product(product)
                .quantityChange(request.quantityChange())
                .quantityAfter(newQuantity)
                .reason(StockMovementReason.MANUAL_ADJUSTMENT)
                .note(request.note().trim())
                .createdBy(user)
                .build();

        return stockMovementMapper.toResponse(stockMovementRepository.save(movement));
    }

    @Transactional(readOnly = true)
    public PageResponse<StockMovementResponse> history(Long productId, Pageable pageable) {
        getProduct(productId);

        Pageable newestFirst = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));

        return PageResponse.from(
                stockMovementRepository.findByProductId(productId, newestFirst)
                        .map(stockMovementMapper::toResponse));
    }

    private Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + id));
    }
}