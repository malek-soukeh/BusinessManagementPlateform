package com.businessmanagementplateform.backend.dto;

import java.math.BigDecimal;
import java.util.Map;

public record DashboardStatsResponse(
        long totalCustomers,
        long totalProducts,
        long lowStockProducts,
        long totalOrders,
        long pendingOrders,
        Map<String, Long> ordersByStatus,
        long unpaidInvoices,
        long overdueInvoices,
        BigDecimal totalRevenue,
        BigDecimal totalCollected,
        BigDecimal totalOutstanding
) {
}