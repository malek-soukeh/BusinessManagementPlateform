import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { InvoiceSummary, canCancelInvoice, daysOverdue, todayIso } from '../models/invoice.models';
import { InvoiceService } from './invoice.service';

describe('InvoiceService', () => {
  const url = `${environment.apiUrl}/invoices`;
  const summary = (id: number, orderId: number): InvoiceSummary => ({
    id, invoiceNumber: `INV-2026-0000${id}`, orderId, orderNumber: `ORD-2026-0000${orderId}`, customerId: 3,
    customerName: 'Sami Trabelsi', issueDate: '2026-10-01', dueDate: '2026-10-31', totalAmount: 119,
    status: 'ISSUED', paymentStatus: 'UNPAID'
  });

  let service: InvoiceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(InvoiceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the invoices, newest first, with the filters', () => {
    service.list({ q: ' INV ', status: 'OVERDUE', paymentStatus: 'UNPAID', page: 2, size: 20 }).subscribe();

    const params = http.expectOne(req => req.url === url).request.params;
    expect(params.get('sort')).toBe('id,desc');
    expect(params.get('q')).toBe('INV');
    expect(params.get('status')).toBe('OVERDUE');
    expect(params.get('paymentStatus')).toBe('UNPAID');
    expect(params.get('page')).toBe('2');
  });

  it('leaves out the empty filters', () => {
    service.list({ q: '', status: '', paymentStatus: '', page: 0, size: 10 }).subscribe();

    expect(http.expectOne(req => req.url === url).request.params.keys().sort()).toEqual(['page', 'size', 'sort']);
  });

  it('finds the invoice of the exact order among the search results', () => {
    let found: InvoiceSummary | null | undefined;
    service.findByOrder(1, 'ORD-2026-00001').subscribe(result => (found = result));

    const request = http.expectOne(req => req.url === url);
    expect(request.request.params.get('q')).toBe('ORD-2026-00001');
    // ORD-2026-00001 also matches ORD-2026-00010.
    request.flush({ content: [summary(5, 10), summary(4, 1)], page: 0, size: 20, totalElements: 2, totalPages: 1 });

    expect(found?.id).toBe(4);
  });

  it('answers null when the order has no invoice', () => {
    let found: InvoiceSummary | null | undefined;
    service.findByOrder(1, 'ORD-2026-00001').subscribe(result => (found = result));

    http.expectOne(req => req.url === url).flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });

    expect(found).toBeNull();
  });

  it('reads, creates and cancels an invoice', () => {
    service.get(4).subscribe();
    service.create({ orderId: 1, discount: 10, dueDate: '2026-11-30' }).subscribe();
    service.cancel(4).subscribe();

    const requests = http.match(req => req.url.startsWith(url));
    expect(requests.map(req => `${req.request.method} ${req.request.url}`)).toEqual([
      `GET ${url}/4`, `POST ${url}`, `POST ${url}/4/cancel`
    ]);
    expect(requests[1].request.body).toEqual({ orderId: 1, discount: 10, dueDate: '2026-11-30' });
  });
});

describe('invoice rules', () => {
  it('allows cancelling an issued or overdue invoice without payment only', () => {
    expect(canCancelInvoice({ status: 'ISSUED', paymentStatus: 'UNPAID' })).toBeTrue();
    expect(canCancelInvoice({ status: 'OVERDUE', paymentStatus: 'UNPAID' })).toBeTrue();
    expect(canCancelInvoice({ status: 'OVERDUE', paymentStatus: 'PARTIALLY_PAID' })).toBeFalse();
    expect(canCancelInvoice({ status: 'PAID', paymentStatus: 'PAID' })).toBeFalse();
    expect(canCancelInvoice({ status: 'CANCELLED', paymentStatus: 'UNPAID' })).toBeFalse();
  });

  it('counts the days of delay and formats today', () => {
    const today = new Date(2026, 9, 21);

    expect(daysOverdue('2026-10-11', today)).toBe(10);
    expect(daysOverdue('2026-10-30', today)).toBe(0);
    expect(todayIso(today)).toBe('2026-10-21');
  });
});
