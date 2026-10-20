import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { stockNoteLabel } from '../models/stock.models';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  const url = `${environment.apiUrl}/products`;
  let service: InventoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(InventoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the movements of a product, page by page', () => {
    service.history(4, 2, 20).subscribe();

    const request = http.expectOne(req => req.url === `${url}/4/stock-movements`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    request.flush({ content: [], page: 2, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('adjusts the stock of a product', () => {
    service.adjust(4, { quantityChange: -3, note: 'Casse' }).subscribe();

    const request = http.expectOne(`${url}/4/stock-adjustments`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ quantityChange: -3, note: 'Casse' });
  });
});

describe('stockNoteLabel', () => {
  it('translates the notes written by the API and keeps the others', () => {
    expect(stockNoteLabel('Initial stock at product creation')).toBe('Stock initial à la création du produit');
    expect(stockNoteLabel('Order ORD-2026-00012')).toBe('Commande ORD-2026-00012');
    expect(stockNoteLabel('Inventaire annuel')).toBe('Inventaire annuel');
    expect(stockNoteLabel(null)).toBe('');
  });
});
