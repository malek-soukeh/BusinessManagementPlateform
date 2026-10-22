import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Role } from '../../../core/models/auth.models';
import { Page } from '../../../core/models/page.models';
import { Product } from '../../../core/models/product.models';
import { AuthService } from '../../../core/services/auth.service';
import { ProductService } from '../../../core/services/product.service';
import { SharedModule } from '../../../shared/shared.module';
import { clickRowMenuItem, openRowMenu } from '../../../testing/menu.helpers';
import { InventoryListComponent } from './inventory-list.component';

registerLocaleData(localeFr);

describe('InventoryListComponent', () => {
  const product = (id: number, changes: Partial<Product> = {}): Product => ({
    id, reference: `REF-${id}`, name: `Produit ${id}`, description: null, purchasePrice: 12.5, sellingPrice: 20,
    quantity: 4, minimumStock: 2, lowStock: false, categoryId: 1, categoryName: 'Informatique', status: 'ACTIVE',
    version: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...changes
  });
  const page = (products: Product[]): Page<Product> => ({
    content: products, page: 0, size: 10, totalElements: products.length, totalPages: 1
  });

  let products: jasmine.SpyObj<ProductService>;
  let dialog: { open: jasmine.Spy };
  let snackBar: { open: jasmine.Spy };

  function create(role: Role = 'MANAGER', queryParams: Record<string, string> = {}): ComponentFixture<InventoryListComponent> {
    TestBed.configureTestingModule({
      declarations: [InventoryListComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: ProductService, useValue: products },
        { provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: LOCALE_ID, useValue: 'fr' }
      ]
    });
    const fixture = TestBed.createComponent(InventoryListComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    products = jasmine.createSpyObj<ProductService>('ProductService', ['list']);
    products.list.and.returnValue(of(page([product(1), product(2, { quantity: 0 })])));
    dialog = { open: jasmine.createSpy('open') };
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('lists the stock of the active products with its value', () => {
    const fixture = create();

    expect(products.list).toHaveBeenCalledWith(
      { q: '', categoryId: null, status: 'ACTIVE', lowStock: false, page: 0, size: 10 });
    const text = (fixture.nativeElement.textContent as string).replace(/\s/g, ' ');
    expect(text).toContain('50,000 TND');
    expect(text).toContain('Rupture');
  });

  it('opens on the low stock when asked', () => {
    create('MANAGER', { lowStock: 'true' });

    expect(products.list.calls.mostRecent().args[0].lowStock).toBeTrue();
  });

  it('searches after a pause in typing', fakeAsync(() => {
    const fixture = create();

    fixture.componentInstance.search.setValue('lap');
    tick(300);

    expect(products.list.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ q: 'lap', page: 0 }));
    flush();
  }));

  it('lets a manager adjust the stock, then reloads', () => {
    dialog.open.and.returnValue({ afterClosed: () => of({ quantityAfter: 9 }) });
    const fixture = create('MANAGER');

    clickRowMenuItem(fixture, 0, 'adjust-button');

    expect(dialog.open.calls.mostRecent().args[1].data.product.id).toBe(1);
    expect(snackBar.open).toHaveBeenCalledWith('Stock de Produit 1 : 9.', 'OK', jasmine.anything());
    expect(products.list).toHaveBeenCalledTimes(2);
  });

  it('does not reload when the adjustment is cancelled', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) });
    const fixture = create('MANAGER');

    clickRowMenuItem(fixture, 0, 'adjust-button');

    expect(products.list).toHaveBeenCalledTimes(1);
  });

  it('shows the history to an employee but not the adjustment', () => {
    const fixture = create('EMPLOYEE');

    expect(openRowMenu(fixture, 0).querySelector('.adjust-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[aria-label="Historique du stock de Produit 1"]')).not.toBeNull();
  });

  it('shows the error and reloads on demand', () => {
    products.list.and.returnValues(throwError(() => new HttpErrorResponse({ status: 0 })), of(page([product(1)])));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Serveur injoignable');

    (fixture.nativeElement.querySelector('.error-panel button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-panel')).toBeNull();
  });

  it('shows no stock value to an employee, whose products come without purchase price', () => {
    const { purchasePrice: _hidden, ...withoutCost } = product(1);
    products.list.and.returnValue(of(page([withoutCost as Product])));
    const fixture = create('EMPLOYEE');

    expect(fixture.nativeElement.querySelector('th.mat-column-value')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('TND');
  });
});
