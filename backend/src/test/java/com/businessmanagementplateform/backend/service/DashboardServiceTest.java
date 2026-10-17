package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.DashboardStatsResponse;
import com.businessmanagementplateform.backend.enums.CustomerStatus;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import com.businessmanagementplateform.backend.enums.OrderStatus;
import com.businessmanagementplateform.backend.enums.ProductStatus;
import com.businessmanagementplateform.backend.repository.CustomerRepository;
import com.businessmanagementplateform.backend.repository.InvoiceRepository;
import com.businessmanagementplateform.backend.repository.OrderRepository;
import com.businessmanagementplateform.backend.repository.PaymentRepository;
import com.businessmanagementplateform.backend.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)class DashboardServiceTest {

    private static final String EMPLOYEE = "employee@techdistrib.tn";

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private void givenCatalogue() {
        when(customerRepository.countByStatus(CustomerStatus.ACTIVE)).thenReturn(12L);
        when(productRepository.countByStatus(ProductStatus.ACTIVE)).thenReturn(30L);
        when(productRepository.countLowStock(ProductStatus.ACTIVE)).thenReturn(4L);
    }

    @Test
    void getStats_returnsTheGlobalFiguresForAdminAndManager() {
        givenCatalogue();
        when(orderRepository.countByStatus(OrderStatus.PENDING)).thenReturn(2L);
        when(orderRepository.countByStatus(OrderStatus.CONFIRMED)).thenReturn(3L);
        when(orderRepository.countByStatus(OrderStatus.SHIPPED)).thenReturn(1L);
        when(orderRepository.countByStatus(OrderStatus.DELIVERED)).thenReturn(5L);
        when(orderRepository.countByStatus(OrderStatus.CANCELLED)).thenReturn(4L);
        when(invoiceRepository.countByStatus(InvoiceStatus.ISSUED)).thenReturn(6L);
        when(invoiceRepository.countByStatus(InvoiceStatus.OVERDUE)).thenReturn(2L);
        when(invoiceRepository.sumTotalByStatusIn(anyCollection())).thenReturn(new BigDecimal("10000.000"));
        when(paymentRepository.sumAllAmounts()).thenReturn(new BigDecimal("4000.000"));

        DashboardStatsResponse stats = dashboardService.getStats(null);

        assertThat(stats.totalCustomers()).isEqualTo(12);
        assertThat(stats.totalProducts()).isEqualTo(30);
        assertThat(stats.lowStockProducts()).isEqualTo(4);
        assertThat(stats.totalOrders()).isEqualTo(15);
        assertThat(stats.pendingOrders()).isEqualTo(2);
        assertThat(stats.ordersByStatus()).containsEntry("DELIVERED", 5L).containsEntry("CANCELLED", 4L);
        assertThat(stats.unpaidInvoices()).isEqualTo(8);
        assertThat(stats.overdueInvoices()).isEqualTo(2);
        assertThat(stats.totalRevenue()).isEqualByComparingTo("10000.000");
        assertThat(stats.totalCollected()).isEqualByComparingTo("4000.000");
        assertThat(stats.totalOutstanding()).isEqualByComparingTo("6000.000");
    }

    @Test
    void getStats_limitsOrdersAndInvoicesToTheEmployeeAndHidesTheMoney() {
        givenCatalogue();
        when(orderRepository.countByStatusAndCreatedByEmailIgnoreCase(OrderStatus.PENDING, EMPLOYEE))
                .thenReturn(1L);
        when(orderRepository.countByStatusAndCreatedByEmailIgnoreCase(OrderStatus.DELIVERED, EMPLOYEE))
                .thenReturn(2L);
        when(invoiceRepository.countByStatusAndOrder_CreatedBy_EmailIgnoreCase(InvoiceStatus.ISSUED, EMPLOYEE))
                .thenReturn(1L);

        DashboardStatsResponse stats = dashboardService.getStats(EMPLOYEE);

        assertThat(stats.totalCustomers()).isEqualTo(12);
        assertThat(stats.lowStockProducts()).isEqualTo(4);
        assertThat(stats.totalOrders()).isEqualTo(3);
        assertThat(stats.pendingOrders()).isEqualTo(1);
        assertThat(stats.unpaidInvoices()).isEqualTo(1);
        assertThat(stats.overdueInvoices()).isZero();
        assertThat(stats.totalRevenue()).isNull();
        assertThat(stats.totalCollected()).isNull();
        assertThat(stats.totalOutstanding()).isNull();

        verify(orderRepository, never()).countByStatus(any());
        verify(invoiceRepository, never()).countByStatus(any());
        verify(invoiceRepository, never()).sumTotalByStatusIn(anyCollection());
        verify(paymentRepository, never()).sumAllAmounts();
    }

    @Test
    void getStats_returnsZeroAmounts_whenThereIsNoInvoiceNorPayment() {
        givenCatalogue();
        when(invoiceRepository.sumTotalByStatusIn(anyCollection())).thenReturn(null);
        when(paymentRepository.sumAllAmounts()).thenReturn(null);

        DashboardStatsResponse stats = dashboardService.getStats(null);

        assertThat(stats.totalRevenue()).isEqualByComparingTo("0.000");
        assertThat(stats.totalCollected()).isEqualByComparingTo("0.000");
        assertThat(stats.totalOutstanding()).isEqualByComparingTo("0.000");
        assertThat(stats.totalOrders()).isZero();
        assertThat(stats.ordersByStatus()).hasSize(OrderStatus.values().length);
    }

    @Test
    void getStats_countsCancelledOrdersInTheTotalButNotInThePendingFigure() {
        givenCatalogue();
        when(orderRepository.countByStatus(OrderStatus.CANCELLED)).thenReturn(7L);
        when(invoiceRepository.sumTotalByStatusIn(anyCollection())).thenReturn(BigDecimal.ZERO);
        when(paymentRepository.sumAllAmounts()).thenReturn(BigDecimal.ZERO);

        DashboardStatsResponse stats = dashboardService.getStats(null);

        assertThat(stats.totalOrders()).isEqualTo(7);
        assertThat(stats.pendingOrders()).isZero();
        verify(orderRepository, never()).countByStatusAndCreatedByEmailIgnoreCase(any(), anyString());
    }
}