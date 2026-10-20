import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page } from '../models/page.models';
import { StockAdjustmentPayload, StockMovement } from '../models/stock.models';

/**
 * Stock of a product. The API has no global movement list: the history is read product by product.
 * Every role reads it; only ADMIN and MANAGER adjust the stock.
 */
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly url = `${environment.apiUrl}/products`;

  constructor(private readonly http: HttpClient) {}

  /** Movements of a product, the newest first (the API forces this order). */
  history(productId: number, page: number, size: number): Observable<Page<StockMovement>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<StockMovement>>(`${this.url}/${productId}/stock-movements`, { params });
  }

  /** Manual correction; refused (409) when the stock would become negative. */
  adjust(productId: number, payload: StockAdjustmentPayload): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.url}/${productId}/stock-adjustments`, payload);
  }
}
