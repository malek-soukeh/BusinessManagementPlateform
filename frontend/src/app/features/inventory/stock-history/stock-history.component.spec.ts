import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Role } from '../../../core/models/auth.models';
import { Page } from '../../../core/models/page.models';
import { Product } from '../../../core/models/product.models';
import { StockMovement } from '../../../core/models/stock.models';
import { AuthService } from '../../../core/services/auth.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProductService } from '../../../core/services/product.service';
import { SharedModule } from '../../../shared/shared.module';
import { StockHistoryComponent } from './stock-history.component';

registerLocaleData(localeFr);

describe('StockHistoryComponent', () => {
  const product: Product = {
    id: 4, reference: 'LAP-001', name: 'Portable Pro', description: null, purchasePrice: 1500, sellingPrice: 2100,
    quantity: 2, minimumStock: 3, lowStock: true, categoryId: 1, categoryName: 'Informatique', status: 'ACTIVE',
    version: 1, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  };
  const movement = (id: number, changes: Partial<StockMovement>): StockMovement => ({
    id, productId: 4, productReference: 'LAP-001', productName: 'Portable Pro', quantityChange: 5, quantityAfter: 5,
    reason: 'INITIAL_STOCK', orderId: null, note: 'Initial stock at product creation',
    createdBy: 'admin@techdistrib.tn', createdAt: '2026-10-01T09:00:00Z', ...changes
  });
  const page = (movements: StockMovement[]): Page<StockMovement> => ({
    content: movements, page: 0, size: 10, totalElements: movements.length, totalPages: 1
  });

  let products: jasmine.SpyObj<ProductService>;
  let inventory: jasmine.SpyObj<InventoryService>;
  let dialog: { open: jasmine.Spy };
  let snackBar: { open: jasmine.Spy };

  function create(role: Role = 'MANAGER', id = '4'): ComponentFixture<StockHistoryComponent> {
    TestBed.configureTestingModule({
      declarations: [StockHistoryComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: ProductService, useValue: products },
        { provide: InventoryService, useValue: inventory },
        { provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: LOCALE_ID, useValue: 'fr' }
      ]
    });
    const fixture = TestBed.createComponent(StockHistoryComponent);
    fixture.detectChanges();
    return fixture;
  }

  const cells = (fixture: ComponentFixture<StockHistoryComponent>, column: string) =>
    Array.from<Element>(fixture.nativeElement.querySelectorAll(`td.mat-column-${column}`))
      .map(cell => (cell.textContent ?? '').replace(/\s+/g, ' ').trim());

  beforeEach(() => {
    products = jasmine.createSpyObj<ProductService>('ProductService', ['get']);
    products.get.and.returnValue(of(product));
    inventory = jasmine.createSpyObj<InventoryService>('InventoryService', ['history', 'adjust']);
    inventory.history.and.returnValue(of(page([
      movement(2, {
        quantityChange: -3, quantityAfter: 2, reason: 'ORDER_CONFIRMED', orderId: 9, note: 'Order ORD-2026-00009',
        createdAt: '2026-10-05T14:30:00Z'
      }),
      movement(1, {})
    ])));
    dialog = { open: jasmine.createSpy('open') };
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('shows the stock level of the product', () => {
    const fixture = create();

    expect(products.get).toHaveBeenCalledWith(4);
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Portable Pro');
    expect(fixture.nativeElement.querySelector('.figure-chip').className).toContain('tone-warning');
    expect((fixture.nativeElement.textContent as string).replace(/\s/g, ' ')).toContain('3 000,000 TND');
  });

  it('lists the movements in French, with signed and colored changes', () => {
    const fixture = create();

    expect(inventory.history).toHaveBeenCalledWith(4, 0, 10);
    expect(cells(fixture, 'reason')).toEqual(['Commande confirmée', 'Stock initial']);
    expect(cells(fixture, 'change')).toEqual(['-3', '+5']);
    expect(cells(fixture, 'detail')).toEqual(['Commande ORD-2026-00009', 'Stock initial à la création du produit']);
    expect(fixture.nativeElement.querySelector('td.negative')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('td.positive')).not.toBeNull();
  });

  it('pages the history on the server', () => {
    const fixture = create();

    fixture.componentInstance.onPage({ pageIndex: 1, pageSize: 20, length: 30 });

    expect(inventory.history).toHaveBeenCalledWith(4, 1, 20);
  });

  it('lets a manager adjust the stock, then reloads the product and the history', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(movement(3, { quantityAfter: 7 })) });
    const fixture = create('MANAGER');

    (fixture.nativeElement.querySelector('#adjust-button') as HTMLButtonElement).click();

    expect(snackBar.open).toHaveBeenCalledWith('Stock mis à jour : 7.', 'OK', jasmine.anything());
    expect(products.get).toHaveBeenCalledTimes(2);
    expect(inventory.history).toHaveBeenCalledTimes(2);
  });

  it('keeps an employee to reading', () => {
    const fixture = create('EMPLOYEE');

    expect(fixture.nativeElement.querySelector('#adjust-button')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Modifier le produit');
    expect(cells(fixture, 'reason').length).toBe(2);
  });

  it('says when the product does not exist', () => {
    products.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    inventory.history.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Produit introuvable.');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('refuses an invalid identifier without calling the API', () => {
    const fixture = create('MANAGER', 'abc');

    expect(products.get).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Produit introuvable.');
  });

  it('says when the product has no movement', () => {
    inventory.history.and.returnValue(of(page([])));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.empty').textContent).toContain('Aucun mouvement de stock');
  });

  it('shows no stock value when the purchase price is not given (employee)', () => {
    const { purchasePrice: _hidden, ...withoutCost } = product;
    products.get.and.returnValue(of(withoutCost as Product));
    const fixture = create('EMPLOYEE');

    expect(fixture.nativeElement.querySelector('.value-figure')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Seuil minimum');
  });
});
