import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { ProductCreatePayload, ProductUpdatePayload } from '../models/product.models';
import { ProductService } from './product.service';

describe('ProductService', () => {
  const url = `${environment.apiUrl}/products`;
  const create: ProductCreatePayload = {
    reference: 'LAP-001', name: 'Portable', description: null, purchasePrice: 1500, sellingPrice: 2100,
    quantity: 4, minimumStock: 2, categoryId: 1
  };
  const update: ProductUpdatePayload = {
    reference: 'LAP-001', name: 'Portable', description: null, purchasePrice: 1500, sellingPrice: 2100,
    minimumStock: 2, categoryId: 1, version: 3
  };

  let service: ProductService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ProductService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the products with the paging, the sort and every filter', () => {
    service.list({ q: ' lap ', categoryId: 2, status: 'ACTIVE', lowStock: true, page: 1, size: 20 }).subscribe();

    const request = http.expectOne(req => req.url === url);
    const params = request.request.params;
    expect(params.get('page')).toBe('1');
    expect(params.get('size')).toBe('20');
    expect(params.get('sort')).toBe('name,asc');
    expect(params.get('q')).toBe('lap');
    expect(params.get('categoryId')).toBe('2');
    expect(params.get('status')).toBe('ACTIVE');
    expect(params.get('lowStock')).toBe('true');
    request.flush({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('leaves out the empty filters', () => {
    service.list({ q: ' ', categoryId: null, status: '', lowStock: false, page: 0, size: 10 }).subscribe();

    const params = http.expectOne(req => req.url === url).request.params;
    expect(params.keys().sort()).toEqual(['page', 'size', 'sort']);
  });

  it('reads, creates, updates and deactivates a product', () => {
    service.get(5).subscribe();
    service.create(create).subscribe();
    service.update(5, update).subscribe();
    service.deactivate(5).subscribe();

    const requests = http.match(req => req.url.startsWith(url));
    expect(requests.map(req => `${req.request.method} ${req.request.url}`)).toEqual([
      `GET ${url}/5`, `POST ${url}`, `PUT ${url}/5`, `DELETE ${url}/5`
    ]);
    expect(requests[1].request.body).toEqual(create);
    expect(requests[2].request.body).toEqual(update);
  });
});
