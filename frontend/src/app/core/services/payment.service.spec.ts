import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { paidAmount, remainingAmount, toMillimes } from '../models/payment.models';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  const url = `${environment.apiUrl}/invoices/4/payments`;
  let service: PaymentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PaymentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the payments of an invoice', () => {
    service.list(4).subscribe();

    expect(http.expectOne(url).request.method).toBe('GET');
  });

  it('records a payment on an invoice', () => {
    service.record(4, { amount: 100.5, method: 'CASH', paymentDate: null }).subscribe();

    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ amount: 100.5, method: 'CASH', paymentDate: null });
  });
});

describe('payment amounts', () => {
  it('computes in millimes, without floating point errors', () => {
    expect(toMillimes(0.1 + 0.2)).toBe(300);
    expect(paidAmount([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
    expect(remainingAmount(0.3, [{ amount: 0.1 }, { amount: 0.2 }])).toBe(0);
  });

  it('gives what is left to pay, never negative', () => {
    expect(remainingAmount(1071, [{ amount: 500 }, { amount: 70.999 }])).toBe(500.001);
    expect(remainingAmount(100, [{ amount: 150 }])).toBe(0);
    expect(remainingAmount(100, [])).toBe(100);
  });
});
