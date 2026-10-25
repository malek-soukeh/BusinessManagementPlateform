package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreateInvoiceRequest;
import com.businessmanagementplateform.backend.dto.InvoiceResponse;
import com.businessmanagementplateform.backend.dto.InvoiceSummaryResponse;
import com.businessmanagementplateform.backend.dto.PageResponse;
import com.businessmanagementplateform.backend.entity.Customer;
import com.businessmanagementplateform.backend.entity.Invoice;
import com.businessmanagementplateform.backend.entity.Order;
import com.businessmanagementplateform.backend.entity.OrderItem;
import com.businessmanagementplateform.backend.entity.Product;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import com.businessmanagementplateform.backend.enums.OrderStatus;
import com.businessmanagementplateform.backend.enums.PaymentStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.InvoiceMapper;
import com.businessmanagementplateform.backend.repository.InvoicePaidAmount;
import com.businessmanagementplateform.backend.repository.InvoiceRepository;
import com.businessmanagementplateform.backend.repository.OrderRepository;
import com.businessmanagementplateform.backend.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-15T10:00:00Z"), ZoneId.of("Africa/Tunis"));
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);
    private static final String EMAIL = "admin@techdistrib.tn";

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentRepository paymentRepository;

    private InvoiceService invoiceService;

    @BeforeEach
    void setUp() {
        invoiceService = new InvoiceService(invoiceRepository, orderRepository, paymentRepository,
                new InvoiceMapper(), CLOCK, new BigDecimal("19"), 30);
    }

    private Order order(OrderStatus status, String total) {
        Customer customer = Customer.builder().id(3L).firstName("Ahmed").lastName("Ben Ali")
                .email("ahmed@email.com").build();
        User creator = User.builder().id(1L).email(EMAIL).build();
        Order order = Order.builder().id(5L).orderNumber("ORD-2026-00005").customer(customer)
                .orderDate(Instant.now()).status(status).totalAmount(new BigDecimal(total))
                .createdBy(creator).build();
        Product product = Product.builder().id(7L).reference("PC001").name("Laptop Dell").build();
        order.addItem(OrderItem.builder().product(product).quantity(1)
                .unitPrice(new BigDecimal(total)).subtotal(new BigDecimal(total)).build());
        return order;
    }

    private void givenSuccessfulSave() {
        when(invoiceRepository.nextInvoiceSequence()).thenReturn(7L);
        when(invoiceRepository.saveAndFlush(any(Invoice.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void givenOrder(OrderStatus status, String total) {
        when(orderRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(order(status, total)));
    }

    private void verifyNothingSaved() {
        verify(invoiceRepository, never()).nextInvoiceSequence();
        verify(invoiceRepository, never()).saveAndFlush(any(Invoice.class));
    }

    // ---------- generate ----------

    @Test
    void generate_computesTaxOnTheNetAmountAndIssuesTheInvoice() {
        givenOrder(OrderStatus.CONFIRMED, "5000.000");
        givenSuccessfulSave();

        InvoiceResponse response = invoiceService.generate(
                new CreateInvoiceRequest(5L, new BigDecimal("500"), null));

        assertThat(response.invoiceNumber()).isEqualTo("INV-2026-00007");
        assertThat(response.orderNumber()).isEqualTo("ORD-2026-00005");
        assertThat(response.customerName()).isEqualTo("Ahmed Ben Ali");
        assertThat(response.subtotal()).isEqualByComparingTo("5000.000");
        assertThat(response.discount()).isEqualByComparingTo("500.000");
        assertThat(response.taxAmount()).isEqualByComparingTo("855.000");
        assertThat(response.totalAmount()).isEqualByComparingTo("5355.000");
        assertThat(response.status()).isEqualTo("ISSUED");
        assertThat(response.paymentStatus()).isEqualTo("UNPAID");
        assertThat(response.issueDate()).isEqualTo(TODAY);
        assertThat(response.dueDate()).isEqualTo(TODAY.plusDays(30));
        assertThat(response.items()).hasSize(1);
    }

    @Test
    void generate_roundsTheTaxToThreeDecimals() {
        givenOrder(OrderStatus.CONFIRMED, "33.333");
        givenSuccessfulSave();

        InvoiceResponse response = invoiceService.generate(new CreateInvoiceRequest(5L, null, null));

        assertThat(response.discount()).isEqualByComparingTo("0.000");
        assertThat(response.taxAmount()).isEqualByComparingTo("6.333");
        assertThat(response.totalAmount()).isEqualByComparingTo("39.666");
    }

    @Test
    void generate_usesTheRequestedDueDate() {
        givenOrder(OrderStatus.CONFIRMED, "100.000");
        givenSuccessfulSave();

        InvoiceResponse response = invoiceService.generate(
                new CreateInvoiceRequest(5L, null, TODAY.plusDays(10)));

        assertThat(response.dueDate()).isEqualTo(TODAY.plusDays(10));
    }

    @Test
    void generate_allowsADiscountEqualToTheSubtotal() {
        givenOrder(OrderStatus.CONFIRMED, "100.000");
        givenSuccessfulSave();

        InvoiceResponse response = invoiceService.generate(
                new CreateInvoiceRequest(5L, new BigDecimal("100"), null));

        assertThat(response.taxAmount()).isEqualByComparingTo("0.000");
        assertThat(response.totalAmount()).isEqualByComparingTo("0.000");
    }

    @Test
    void generate_throwsConflict_whenDueDateIsBeforeToday() {
        givenOrder(OrderStatus.CONFIRMED, "100.000");

        assertThatThrownBy(() -> invoiceService.generate(
                new CreateInvoiceRequest(5L, null, TODAY.minusDays(1))))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Due date");
        verifyNothingSaved();
    }

    @Test
    void generate_throwsConflict_whenDiscountExceedsTheSubtotal() {
        givenOrder(OrderStatus.CONFIRMED, "100.000");

        assertThatThrownBy(() -> invoiceService.generate(
                new CreateInvoiceRequest(5L, new BigDecimal("100.001"), null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Discount cannot exceed");
        verifyNothingSaved();
    }

    @Test
    void generate_throwsNotFound_whenOrderMissing() {
        when(orderRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.generate(new CreateInvoiceRequest(99L, null, null)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @ParameterizedTest(name = "an order {0} cannot be invoiced")
    @EnumSource(value = OrderStatus.class, names = {"PENDING", "CANCELLED"})
    void generate_throwsConflict_whenOrderIsNotInvoiceable(OrderStatus status) {
        givenOrder(status, "100.000");

        assertThatThrownBy(() -> invoiceService.generate(new CreateInvoiceRequest(5L, null, null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Cannot invoice an order with status " + status);
        verifyNothingSaved();
    }

    @ParameterizedTest(name = "an order {0} can be invoiced")
    @EnumSource(value = OrderStatus.class, names = {"CONFIRMED", "SHIPPED", "DELIVERED"})
    void generate_acceptsConfirmedShippedAndDeliveredOrders(OrderStatus status) {
        givenOrder(status, "100.000");
        givenSuccessfulSave();

        InvoiceResponse response = invoiceService.generate(new CreateInvoiceRequest(5L, null, null));

        assertThat(response.status()).isEqualTo("ISSUED");
        assertThat(response.totalAmount()).isEqualByComparingTo("119.000");
    }

    @Test
    void generate_throwsConflict_whenOrderIsAlreadyInvoiced() {
        givenOrder(OrderStatus.CONFIRMED, "100.000");
        when(invoiceRepository.existsByOrderIdAndStatusNot(5L, InvoiceStatus.CANCELLED)).thenReturn(true);

        assertThatThrownBy(() -> invoiceService.generate(new CreateInvoiceRequest(5L, null, null)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Order already invoiced: ORD-2026-00005");
        verifyNothingSaved();
    }

    @Test
    void generate_allowsANewInvoice_whenThePreviousOneWasCancelled() {
        givenOrder(OrderStatus.CONFIRMED, "100.000");
        givenSuccessfulSave();

        InvoiceResponse response = invoiceService.generate(new CreateInvoiceRequest(5L, null, null));

        assertThat(response.status()).isEqualTo("ISSUED");
        // Only a non-cancelled invoice blocks the order: the check looks past the cancelled ones.
        verify(invoiceRepository).existsByOrderIdAndStatusNot(5L, InvoiceStatus.CANCELLED);
        verify(invoiceRepository).saveAndFlush(any(Invoice.class));
    }

    // ---------- findById / findAll ----------

    private Invoice invoice() {
        return invoice(9L);
    }

    private Invoice invoice(Long id) {
        return Invoice.builder().id(id).invoiceNumber(String.format("INV-2026-%05d", id))
                .order(order(OrderStatus.CONFIRMED, "100.000"))
                .issueDate(TODAY).dueDate(TODAY.plusDays(30))
                .subtotal(new BigDecimal("100.000")).taxAmount(new BigDecimal("19.000"))
                .discount(new BigDecimal("0.000")).totalAmount(new BigDecimal("119.000"))
                .status(InvoiceStatus.ISSUED).paymentStatus(PaymentStatus.UNPAID).build();
    }

    private InvoicePaidAmount paid(long invoiceId, String amount) {
        return new InvoicePaidAmount() {
            @Override
            public Long getInvoiceId() {
                return invoiceId;
            }

            @Override
            public BigDecimal getPaidAmount() {
                return new BigDecimal(amount);
            }
        };
    }

    @Test
    void findById_hidesInvoicesOfOtherUsers_whenAccessIsRestricted() {
        when(invoiceRepository.findById(9L)).thenReturn(Optional.of(invoice()));

        assertThat(invoiceService.findById(9L, EMAIL).invoiceNumber()).isEqualTo("INV-2026-00009");
        assertThat(invoiceService.findById(9L, "ADMIN@techdistrib.tn").id()).isEqualTo(9L);
        assertThat(invoiceService.findById(9L, null).id()).isEqualTo(9L);
        assertThatThrownBy(() -> invoiceService.findById(9L, "other@techdistrib.tn"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("9");
    }

    @Test
    void findAll_returnsAPageOfSummaries() {
        Pageable pageable = PageRequest.of(0, 20);
        when(invoiceRepository.findAll(ArgumentMatchers.<Specification<Invoice>>any(), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(invoice()), pageable, 1));

        PageResponse<InvoiceSummaryResponse> result = invoiceService.findAll(
                "INV", InvoiceStatus.ISSUED, PaymentStatus.UNPAID, null, pageable);

        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.content().get(0).invoiceNumber()).isEqualTo("INV-2026-00009");
        assertThat(result.content().get(0).paymentStatus()).isEqualTo("UNPAID");
    }

    // ---------- paid and remaining amounts ----------

    @Test
    void generate_startsWithNothingPaid() {
        givenOrder(OrderStatus.CONFIRMED, "5000.000");
        givenSuccessfulSave();

        InvoiceResponse response = invoiceService.generate(
                new CreateInvoiceRequest(5L, new BigDecimal("500"), null));

        assertThat(response.paidAmount()).isEqualByComparingTo("0.000");
        assertThat(response.remainingAmount()).isEqualByComparingTo("5355.000");
    }

    @Test
    void findById_reportsThePaidAndRemainingAmounts() {
        when(invoiceRepository.findById(9L)).thenReturn(Optional.of(invoice()));
        when(paymentRepository.sumAmountByInvoiceIds(List.of(9L)))
                .thenReturn(List.of(paid(9L, "50.000")));

        InvoiceResponse response = invoiceService.findById(9L, null);

        assertThat(response.paidAmount()).isEqualByComparingTo("50.000");
        assertThat(response.remainingAmount()).isEqualByComparingTo("69.000");
    }

    @Test
    void findById_reportsNothingPaid_whenTheInvoiceHasNoPayment() {
        when(invoiceRepository.findById(9L)).thenReturn(Optional.of(invoice()));
        when(paymentRepository.sumAmountByInvoiceIds(List.of(9L))).thenReturn(List.of());

        InvoiceResponse response = invoiceService.findById(9L, null);

        assertThat(response.paidAmount()).isEqualByComparingTo("0.000");
        assertThat(response.remainingAmount()).isEqualByComparingTo("119.000");
    }

    @Test
    void findById_neverReportsANegativeRemainingAmount() {
        when(invoiceRepository.findById(9L)).thenReturn(Optional.of(invoice()));
        when(paymentRepository.sumAmountByInvoiceIds(List.of(9L)))
                .thenReturn(List.of(paid(9L, "200.000")));

        assertThat(invoiceService.findById(9L, null).remainingAmount()).isEqualByComparingTo("0.000");
    }

    @Test
    void findAll_readsThePaymentsOfTheWholePageInOneQuery() {
        Pageable pageable = PageRequest.of(0, 20);
        when(invoiceRepository.findAll(ArgumentMatchers.<Specification<Invoice>>any(), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(invoice(9L), invoice(10L)), pageable, 2));
        when(paymentRepository.sumAmountByInvoiceIds(List.of(9L, 10L)))
                .thenReturn(List.of(paid(9L, "119.000")));

        PageResponse<InvoiceSummaryResponse> result = invoiceService.findAll(
                null, null, null, null, pageable);

        InvoiceSummaryResponse fullyPaid = result.content().get(0);
        InvoiceSummaryResponse unpaid = result.content().get(1);
        assertThat(fullyPaid.paidAmount()).isEqualByComparingTo("119.000");
        assertThat(fullyPaid.remainingAmount()).isEqualByComparingTo("0.000");
        assertThat(unpaid.paidAmount()).isEqualByComparingTo("0.000");
        assertThat(unpaid.remainingAmount()).isEqualByComparingTo("119.000");
        verify(paymentRepository, times(1)).sumAmountByInvoiceIds(any());
    }

    @Test
    void findAll_doesNotQueryThePayments_whenThePageIsEmpty() {
        Pageable pageable = PageRequest.of(0, 20);
        when(invoiceRepository.findAll(ArgumentMatchers.<Specification<Invoice>>any(), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        assertThat(invoiceService.findAll(null, null, null, null, pageable).content()).isEmpty();

        verifyNoInteractions(paymentRepository);
    }

    // ---------- zero-amount invoice ----------

    @Test
    void generate_settlesTheInvoiceAtCreation_whenTheNetAmountIsZero() {
        givenOrder(OrderStatus.CONFIRMED, "100.000");
        givenSuccessfulSave();

        InvoiceResponse response = invoiceService.generate(
                new CreateInvoiceRequest(5L, new BigDecimal("100"), null));

        assertThat(response.status()).isEqualTo("PAID");
        assertThat(response.paymentStatus()).isEqualTo("PAID");
    }

    // ---------- cancel ----------

    @ParameterizedTest(name = "an {0} invoice without payment can be cancelled")
    @EnumSource(value = InvoiceStatus.class, names = {"ISSUED", "OVERDUE"})
    void cancel_cancelsAnInvoiceWithoutPayments(InvoiceStatus status) {
        Invoice invoice = invoice();
        invoice.setStatus(status);
        when(invoiceRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.saveAndFlush(any(Invoice.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        InvoiceResponse response = invoiceService.cancel(9L);

        assertThat(response.status()).isEqualTo("CANCELLED");
        assertThat(response.paidAmount()).isEqualByComparingTo("0.000");
        assertThat(response.remainingAmount()).isEqualByComparingTo("0.000");
    }

    @Test
    void cancel_throwsConflict_whenTheInvoiceAlreadyHasPayments() {
        Invoice invoice = invoice();
        invoice.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
        when(invoiceRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.cancel(9L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already has payments");

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.ISSUED);
        verify(invoiceRepository, never()).saveAndFlush(any(Invoice.class));
    }

    @ParameterizedTest(name = "a {0} invoice cannot be cancelled")
    @EnumSource(value = InvoiceStatus.class, names = {"PAID", "CANCELLED"})
    void cancel_throwsConflict_whenTheInvoiceIsNotIssuedOrOverdue(InvoiceStatus status) {
        Invoice invoice = invoice();
        invoice.setStatus(status);
        when(invoiceRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.cancel(9L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Cannot cancel an invoice with status " + status);
        verify(invoiceRepository, never()).saveAndFlush(any(Invoice.class));
    }

    @Test
    void cancel_throwsNotFound_whenTheInvoiceIsMissing() {
        when(invoiceRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.cancel(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    // ---------- markOverdue ----------

    @Test
    void markOverdue_flagsTheLateIssuedInvoices() {
        Invoice late1 = invoice();
        Invoice late2 = invoice();
        when(invoiceRepository.findByStatusAndDueDateBefore(InvoiceStatus.ISSUED, TODAY))
                .thenReturn(List.of(late1, late2));

        int count = invoiceService.markOverdue();

        assertThat(count).isEqualTo(2);
        assertThat(late1.getStatus()).isEqualTo(InvoiceStatus.OVERDUE);
        assertThat(late2.getStatus()).isEqualTo(InvoiceStatus.OVERDUE);
        verify(invoiceRepository).saveAll(List.of(late1, late2));
    }

    @Test
    void markOverdue_doesNothing_whenNoInvoiceIsLate() {
        when(invoiceRepository.findByStatusAndDueDateBefore(InvoiceStatus.ISSUED, TODAY))
                .thenReturn(List.of());

        assertThat(invoiceService.markOverdue()).isZero();
        verify(invoiceRepository, never()).saveAll(ArgumentMatchers.<Iterable<Invoice>>any());
    }
}