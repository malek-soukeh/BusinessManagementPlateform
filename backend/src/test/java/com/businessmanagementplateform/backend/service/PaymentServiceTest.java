package com.businessmanagementplateform.backend.service;

import com.businessmanagementplateform.backend.dto.CreatePaymentRequest;
import com.businessmanagementplateform.backend.dto.PaymentResponse;
import com.businessmanagementplateform.backend.entity.Invoice;
import com.businessmanagementplateform.backend.entity.Order;
import com.businessmanagementplateform.backend.entity.Payment;
import com.businessmanagementplateform.backend.entity.User;
import com.businessmanagementplateform.backend.enums.InvoiceStatus;
import com.businessmanagementplateform.backend.enums.PaymentMethod;
import com.businessmanagementplateform.backend.enums.PaymentStatus;
import com.businessmanagementplateform.backend.exception.ConflictException;
import com.businessmanagementplateform.backend.exception.ResourceNotFoundException;
import com.businessmanagementplateform.backend.mapper.PaymentMapper;
import com.businessmanagementplateform.backend.repository.InvoiceRepository;
import com.businessmanagementplateform.backend.repository.PaymentRepository;
import com.businessmanagementplateform.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-15T10:00:00Z"), ZoneId.of("Africa/Tunis"));
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);
    private static final String EMAIL = "admin@techdistrib.tn";

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(invoiceRepository, paymentRepository,
                userRepository, new PaymentMapper(), CLOCK);
    }

    // ---------- helpers ----------

    private User user() {
        return User.builder().id(1L).email(EMAIL).build();
    }

    /** Invoice of 119.000 (100.000 + 19.000 tax). */
    private Invoice invoice(InvoiceStatus status, PaymentStatus paymentStatus) {
        Order order = Order.builder().id(5L).orderNumber("ORD-2026-00005").createdBy(user()).build();
        return Invoice.builder().id(9L).invoiceNumber("INV-2026-00009").order(order)
                .issueDate(TODAY).dueDate(TODAY.plusDays(30))
                .subtotal(new BigDecimal("100.000")).taxAmount(new BigDecimal("19.000"))
                .discount(new BigDecimal("0.000")).totalAmount(new BigDecimal("119.000"))
                .status(status).paymentStatus(paymentStatus).build();
    }

    /** alreadyPaid = null means "no payment yet" (the SUM of an empty set). */
    private void givenInvoice(Invoice invoice, String alreadyPaid) {
        when(invoiceRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumAmountByInvoiceId(9L))
                .thenReturn(alreadyPaid == null ? null : new BigDecimal(alreadyPaid));
    }

    private void givenUserAndSave() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user()));
        when(paymentRepository.saveAndFlush(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private CreatePaymentRequest request(String amount) {
        return new CreatePaymentRequest(new BigDecimal(amount), PaymentMethod.CASH, null);
    }

    // ---------- record ----------

    @Test
    void record_partialPayment_marksTheInvoicePartiallyPaid() {
        Invoice invoice = invoice(InvoiceStatus.ISSUED, PaymentStatus.UNPAID);
        givenInvoice(invoice, null);
        givenUserAndSave();

        PaymentResponse response = paymentService.record(9L, request("50"), EMAIL);

        assertThat(response.amount()).isEqualByComparingTo("50.000");
        assertThat(response.method()).isEqualTo("CASH");
        assertThat(response.invoiceNumber()).isEqualTo("INV-2026-00009");
        assertThat(response.createdBy()).isEqualTo(EMAIL);
        assertThat(response.paymentDate()).isEqualTo(CLOCK.instant());
        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PARTIALLY_PAID);
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.ISSUED);
        verify(invoiceRepository).saveAndFlush(invoice);
    }

    @Test
    void record_fullPayment_settlesTheInvoice() {
        Invoice invoice = invoice(InvoiceStatus.ISSUED, PaymentStatus.UNPAID);
        givenInvoice(invoice, null);
        givenUserAndSave();

        paymentService.record(9L, request("119"), EMAIL);

        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void record_lastPayment_settlesTheRemainingBalance() {
        Invoice invoice = invoice(InvoiceStatus.ISSUED, PaymentStatus.PARTIALLY_PAID);
        givenInvoice(invoice, "50.000");
        givenUserAndSave();

        paymentService.record(9L, request("69"), EMAIL);

        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void record_partialPaymentOnAnOverdueInvoice_keepsItOverdue() {
        Invoice invoice = invoice(InvoiceStatus.OVERDUE, PaymentStatus.UNPAID);
        givenInvoice(invoice, null);
        givenUserAndSave();

        paymentService.record(9L, request("10"), EMAIL);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.OVERDUE);
        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PARTIALLY_PAID);
    }

    @Test
    void record_throwsConflict_whenTheAmountExceedsTheRemainingBalance() {
        Invoice invoice = invoice(InvoiceStatus.ISSUED, PaymentStatus.PARTIALLY_PAID);
        givenInvoice(invoice, "100.000");

        assertThatThrownBy(() -> paymentService.record(9L, request("19.001"), EMAIL))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("exceeds the remaining balance")
                .hasMessageContaining("19.000");

        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PARTIALLY_PAID);
        verify(paymentRepository, never()).saveAndFlush(any(Payment.class));
        verify(invoiceRepository, never()).saveAndFlush(any(Invoice.class));
    }

    @ParameterizedTest(name = "a {0} invoice refuses payments")
    @EnumSource(value = InvoiceStatus.class, names = {"DRAFT", "PAID", "CANCELLED"})
    void record_throwsConflict_whenTheInvoiceIsNotPayable(InvoiceStatus status) {
        when(invoiceRepository.findByIdForUpdate(9L))
                .thenReturn(Optional.of(invoice(status, PaymentStatus.UNPAID)));

        assertThatThrownBy(() -> paymentService.record(9L, request("10"), EMAIL))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("with status " + status);
        verify(paymentRepository, never()).saveAndFlush(any(Payment.class));
    }

    @Test
    void record_throwsNotFound_whenTheInvoiceIsMissing() {
        when(invoiceRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.record(99L, request("10"), EMAIL))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void record_usesTheGivenPaymentDate() {
        givenInvoice(invoice(InvoiceStatus.ISSUED, PaymentStatus.UNPAID), null);
        givenUserAndSave();
        Instant date = Instant.parse("2026-10-01T08:30:00Z");

        PaymentResponse response = paymentService.record(9L,
                new CreatePaymentRequest(new BigDecimal("10"), PaymentMethod.BANK_TRANSFER, date), EMAIL);

        assertThat(response.paymentDate()).isEqualTo(date);
        assertThat(response.method()).isEqualTo("BANK_TRANSFER");
    }

    // ---------- findByInvoice ----------

    private Payment payment(Invoice invoice, String amount) {
        return Payment.builder().id(1L).invoice(invoice).amount(new BigDecimal(amount))
                .method(PaymentMethod.CASH).paymentDate(CLOCK.instant()).createdBy(user()).build();
    }

    @Test
    void findByInvoice_returnsTheHistory() {
        Invoice invoice = invoice(InvoiceStatus.ISSUED, PaymentStatus.PARTIALLY_PAID);
        when(invoiceRepository.findById(9L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.findByInvoiceIdOrderByPaymentDateDescIdDesc(9L))
                .thenReturn(List.of(payment(invoice, "30.000"), payment(invoice, "20.000")));

        List<PaymentResponse> history = paymentService.findByInvoice(9L, null);

        assertThat(history).hasSize(2);
        assertThat(history.get(0).amount()).isEqualByComparingTo("30.000");
        assertThat(history.get(0).invoiceId()).isEqualTo(9L);
    }

    @Test
    void findByInvoice_isAllowedForTheOwnerOfTheOrder() {
        Invoice invoice = invoice(InvoiceStatus.ISSUED, PaymentStatus.UNPAID);
        when(invoiceRepository.findById(9L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.findByInvoiceIdOrderByPaymentDateDescIdDesc(9L)).thenReturn(List.of());

        assertThat(paymentService.findByInvoice(9L, "ADMIN@techdistrib.tn")).isEmpty();
    }

    @Test
    void findByInvoice_hidesTheInvoiceOfOtherUsers() {
        when(invoiceRepository.findById(9L))
                .thenReturn(Optional.of(invoice(InvoiceStatus.ISSUED, PaymentStatus.UNPAID)));

        assertThatThrownBy(() -> paymentService.findByInvoice(9L, "other@techdistrib.tn"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("9");
        verify(paymentRepository, never()).findByInvoiceIdOrderByPaymentDateDescIdDesc(any());
    }
}