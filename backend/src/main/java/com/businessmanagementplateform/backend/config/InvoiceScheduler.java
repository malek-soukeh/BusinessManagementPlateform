package com.businessmanagementplateform.backend.config;

import com.businessmanagementplateform.backend.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class InvoiceScheduler {

    private final InvoiceService invoiceService;

    /** Runs every day at 00:05 (Tunis time), and once at startup in case the app was down. */
    @Scheduled(cron = "0 5 0 * * *", zone = "Africa/Tunis")
    @EventListener(ApplicationReadyEvent.class)
    public void flagOverdueInvoices() {
        int count = invoiceService.markOverdue();
        log.info("Overdue invoices flagged: {}", count);
    }
}