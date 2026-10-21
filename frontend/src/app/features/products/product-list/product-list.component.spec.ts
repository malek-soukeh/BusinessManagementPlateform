import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Role } from '../../../core/models/auth.models';
import { Category } from '../../../core/models/category.models';
import { Page } from '../../../core/models/page.models';
import { Product } from '../../../core/models/product.models';
import { AuthService } from '../../../core/services/auth.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { SharedModule } from '../../../shared/shared.module';
import { clickRowMenuItem, openRowMenu } from '../../../testing/menu.helpers';
import { ProductListComponent } from './product-list.component';

describe('ProductListComponent', () => {
  const product = (id: number, changes: Partial<Product> = {}): Product => ({
    id, reference: `REF-${id}`, name: `Produit ${id}`, description: null, purchasePrice: 100, sellingPrice: 150,
    quantity: 10, minimumStock: 2, lowStock: false, categoryId: 1, categoryName: 'Informatique', status: 'ACTIVE',
    version: 4, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...changes
  });
  const page = (products: Product[]): Page<Product> => ({
    content: products, page: 0, size: 10, totalElements: products.length, totalPages: 1
  });
  const category: Category = {
    id: 1, name: 'Informatique', description: null, parentId: null, parentName: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  };

  let service: jasmine.SpyObj<ProductService>;
  let categories: jasmine.SpyObj<CategoryService>;
  let dialog: { open: jasmine.Spy };
  let snackBar: { open: jasmine.Spy };

  function create(role: Role = 'MANAGER', queryParams: Record<string, string> = {}): ComponentFixture<ProductListComponent> {
    TestBed.configureTestingModule({
      declarations: [ProductListComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: ProductService, useValue: service },
        { provide: CategoryService, useValue: categories },
        { provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    });
    const fixture = TestBed.createComponent(ProductListComponent);
    fixture.detectChanges();
    return fixture;
  }

  const rows = (fixture: ComponentFixture<ProductListComponent>) =>
    fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLElement>;

  beforeEach(() => {
    service = jasmine.createSpyObj<ProductService>('ProductService', ['list', 'get', 'create', 'update', 'deactivate']);
    service.list.and.returnValue(of(page([product(1), product(2, { quantity: 1, minimumStock: 2 })])));
    categories = jasmine.createSpyObj<CategoryService>('CategoryService', ['list']);
    categories.list.and.returnValue(of([category]));
    dialog = { open: jasmine.createSpy('open') };
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('loads the active products on start, sorted by the API', () => {
    const fixture = create();

    expect(service.list).toHaveBeenCalledWith(
      { q: '', categoryId: null, status: 'ACTIVE', lowStock: false, page: 0, size: 10 });
    expect(rows(fixture).length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('REF-1');
    expect(fixture.nativeElement.textContent).toContain('2 produit(s)');
  });

  it('opens on the products in low stock when asked by the dashboard', () => {
    create('MANAGER', { lowStock: 'true' });

    expect(service.list.calls.mostRecent().args[0].lowStock).toBeTrue();
  });

  it('colors the stock: enough, low or out', () => {
    service.list.and.returnValue(of(page([
      product(1), product(2, { quantity: 2, minimumStock: 2 }), product(3, { quantity: 0 })
    ])));
    const fixture = create();

    const chips = Array.from<Element>(fixture.nativeElement.querySelectorAll('td .status-chip'))
      .filter(chip => /^\d+$/.test(chip.textContent?.trim() ?? ''))
      .map(chip => chip.className);
    expect(chips[0]).toContain('tone-success');
    expect(chips[1]).toContain('tone-warning');
    expect(chips[2]).toContain('tone-danger');
  });

  it('searches after a pause in typing and goes back to the first page', fakeAsync(() => {
    const fixture = create();
    fixture.componentInstance.onPage({ pageIndex: 2, pageSize: 10, length: 40 });

    fixture.componentInstance.search.setValue('lap');
    tick(300);

    expect(service.list.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ q: 'lap', page: 0 }));
    flush();
  }));

  it('filters by category, status and low stock', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.onCategoryChange(1);
    component.onStatusChange('');
    component.onLowStockChange(true);

    expect(service.list.calls.mostRecent().args[0]).toEqual(
      { q: '', categoryId: 1, status: '', lowStock: true, page: 0, size: 10 });
  });

  it('gives a manager the category filter and the actions', () => {
    const fixture = create('MANAGER');

    expect(categories.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Nouveau produit');
    expect(fixture.nativeElement.querySelectorAll('.row-menu-button').length).toBe(2);
    expect(openRowMenu(fixture, 0).querySelector('.deactivate-button')).not.toBeNull();
  });

  it('keeps an employee to reading, without the categories he may not read', () => {
    const fixture = create('EMPLOYEE');

    expect(categories.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Nouveau produit');
    expect(fixture.nativeElement.querySelector('.row-menu-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href$="/edit"]')).toBeNull();
    expect(rows(fixture).length).toBe(2);
  });

  it('deactivates after confirmation', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) });
    service.deactivate.and.returnValue(of(undefined));
    const fixture = create();

    clickRowMenuItem(fixture, 0, 'deactivate-button');

    expect(service.deactivate).toHaveBeenCalledWith(1);
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(snackBar.open).toHaveBeenCalledWith('Produit désactivé.', 'OK', jasmine.anything());
  });

  it('reactivates with the version read, so that a concurrent change is detected', () => {
    service.list.and.returnValue(of(page([product(3, { status: 'INACTIVE' })])));
    service.update.and.returnValue(of(product(3)));
    const fixture = create();

    clickRowMenuItem(fixture, 0, 'reactivate-button');

    expect(service.update).toHaveBeenCalledWith(3, jasmine.objectContaining({ status: 'ACTIVE', version: 4 }));
  });

  it('shows the error in French and reloads on demand', () => {
    service.list.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      of(page([product(1)])));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Serveur injoignable');

    (fixture.nativeElement.querySelector('.error-panel button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-panel')).toBeNull();
    expect(rows(fixture).length).toBe(1);
  });

  it('says when no product matches', () => {
    service.list.and.returnValue(of(page([])));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('app-empty-state').textContent).toContain('Aucun produit trouvé');
  });

  it('shows the active filters as chips and resets them all', () => {
    const fixture = create('MANAGER', { lowStock: 'true' });

    fixture.componentInstance.onCategoryChange(1);
    fixture.detectChanges();

    const chips = Array.from<Element>(fixture.nativeElement.querySelectorAll('.filter-chip'))
      .map(chip => chip.textContent?.replace('close', '').trim());
    expect(chips).toEqual(['Catégorie : Informatique', 'Stock bas']);

    (fixture.nativeElement.querySelector('.reset-filters') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.list.calls.mostRecent().args[0]).toEqual(
      { q: '', categoryId: null, status: 'ACTIVE', lowStock: false, page: 0, size: 10 });
    expect(fixture.nativeElement.querySelector('.active-filters')).toBeNull();
  });
});
