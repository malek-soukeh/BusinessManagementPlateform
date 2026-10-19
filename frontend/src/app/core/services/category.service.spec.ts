import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CategoryPayload } from '../models/category.models';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  const url = `${environment.apiUrl}/categories`;
  const payload: CategoryPayload = { name: 'Ordinateurs', description: null, parentId: 1 };

  let service: CategoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(CategoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists every category', () => {
    service.list().subscribe();

    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('reads one category', () => {
    service.get(3).subscribe();

    expect(http.expectOne(`${url}/3`).request.method).toBe('GET');
  });

  it('creates a category', () => {
    service.create(payload).subscribe();

    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
  });

  it('updates a category', () => {
    service.update(3, payload).subscribe();

    const request = http.expectOne(`${url}/3`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
  });

  it('deletes a category', () => {
    service.delete(3).subscribe();

    expect(http.expectOne(`${url}/3`).request.method).toBe('DELETE');
  });
});
