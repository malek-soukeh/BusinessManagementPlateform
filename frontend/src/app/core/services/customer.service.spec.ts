import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { Customer, CustomerPayload } from '../models/customer.models';
import { CustomerService } from './customer.service';

describe('CustomerService', () => {
  const url = `${environment.apiUrl}/customers`;
  const payload: CustomerPayload = {
    firstName: 'Sami', lastName: 'Trabelsi', email: 'sami@mail.tn',
    phone: null, address: null, company: null, taxNumber: null
  };

  let service: CustomerService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(CustomerService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists customers with the paging, the sort and the filters', () => {
    service.list({ q: ' ali ', status: 'ACTIVE', page: 2, size: 20 }).subscribe();

    const request = http.expectOne(req => req.url === url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('sort')).toBe('id,desc');
    expect(request.request.params.get('q')).toBe('ali');
    expect(request.request.params.get('status')).toBe('ACTIVE');
    request.flush({ content: [], page: 2, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('leaves out the blank filters', () => {
    service.list({ q: '  ', status: '', page: 0, size: 10 }).subscribe();

    const request = http.expectOne(req => req.url === url);
    expect(request.request.params.has('q')).toBeFalse();
    expect(request.request.params.has('status')).toBeFalse();
    request.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
  });

  it('reads one customer', () => {
    service.get(7).subscribe();

    const request = http.expectOne(`${url}/7`);
    expect(request.request.method).toBe('GET');
    request.flush({} as Customer);
  });

  it('creates a customer', () => {
    service.create(payload).subscribe();

    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({} as Customer);
  });

  it('updates a customer', () => {
    service.update(7, { ...payload, status: 'INACTIVE' }).subscribe();

    const request = http.expectOne(`${url}/7`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ ...payload, status: 'INACTIVE' });
    request.flush({} as Customer);
  });

  it('deactivates a customer', () => {
    service.deactivate(7).subscribe();

    const request = http.expectOne(`${url}/7`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});