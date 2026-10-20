import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { ORDER_TRANSITIONS, OrderPayload } from '../models/order.models';
import { OrderService } from './order.service';

describe('OrderService', () => {
  const url = `${environment.apiUrl}/orders`;
  const payload: OrderPayload = { customerId: 3, items: [{ productId: 7, quantity: 2 }] };

  let service: OrderService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the orders, newest first, with the filters', () => {
    service.list({ q: ' ORD-2026 ', status: 'PENDING', customerId: 3, page: 1, size: 20 }).subscribe();

    const params = http.expectOne(req => req.url === url).request.params;
    expect(params.get('sort')).toBe('id,desc');
    expect(params.get('q')).toBe('ORD-2026');
    expect(params.get('status')).toBe('PENDING');
    expect(params.get('customerId')).toBe('3');
    expect(params.get('page')).toBe('1');
    expect(params.get('size')).toBe('20');
  });

  it('leaves out the empty filters', () => {
    service.list({ q: '', status: '', customerId: null, page: 0, size: 10 }).subscribe();

    expect(http.expectOne(req => req.url === url).request.params.keys().sort()).toEqual(['page', 'size', 'sort']);
  });

  it('reads, creates, updates and moves an order', () => {
    service.get(5).subscribe();
    service.create(payload).subscribe();
    service.update(5, payload).subscribe();
    service.changeStatus(5, 'CONFIRMED').subscribe();

    const requests = http.match(req => req.url.startsWith(url));
    expect(requests.map(req => `${req.request.method} ${req.request.url}`)).toEqual([
      `GET ${url}/5`, `POST ${url}`, `PUT ${url}/5`, `PATCH ${url}/5/status`
    ]);
    expect(requests[1].request.body).toEqual(payload);
    expect(requests[3].request.body).toEqual({ status: 'CONFIRMED' });
  });

  it('mirrors the workflow of the API', () => {
    expect(ORDER_TRANSITIONS.PENDING).toEqual(['CONFIRMED', 'CANCELLED']);
    expect(ORDER_TRANSITIONS.CONFIRMED).toEqual(['SHIPPED', 'CANCELLED']);
    expect(ORDER_TRANSITIONS.SHIPPED).toEqual(['DELIVERED']);
    expect(ORDER_TRANSITIONS.DELIVERED).toEqual([]);
    expect(ORDER_TRANSITIONS.CANCELLED).toEqual([]);
  });
});
