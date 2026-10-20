import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Category } from '../../../core/models/category.models';
import { Product } from '../../../core/models/product.models';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { SharedModule } from '../../../shared/shared.module';
import { ProductFormComponent } from './product-form.component';

describe('ProductFormComponent', () => {
  const category: Category = {
    id: 1, name: 'Informatique', description: null, parentId: null, parentName: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  };
  const existing: Product = {
    id: 5, reference: 'LAP-001', name: 'Portable Pro', description: 'Écran 14 pouces', purchasePrice: 1500,
    sellingPrice: 2100, quantity: 8, minimumStock: 3, lowStock: false, categoryId: 1, categoryName: 'Informatique',
    status: 'ACTIVE', version: 7, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  };

  let service: jasmine.SpyObj<ProductService>;
  let categories: jasmine.SpyObj<CategoryService>;
  let router: Router;
  let snackBar: { open: jasmine.Spy };

  function create(id?: string): ComponentFixture<ProductFormComponent> {
    TestBed.configureTestingModule({
      declarations: [ProductFormComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: ProductService, useValue: service },
        { provide: CategoryService, useValue: categories },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  const fill = (component: ProductFormComponent) => component.form.patchValue({
    reference: ' lap-002 ', name: ' Portable Air ', description: '', categoryId: 1,
    purchasePrice: 1000, sellingPrice: 1250.5, quantity: 5, minimumStock: 2
  });

  const conflict = (message: string) => throwError(() => new HttpErrorResponse({ status: 409, error: { message } }));

  beforeEach(() => {
    service = jasmine.createSpyObj<ProductService>('ProductService', ['list', 'get', 'create', 'update', 'deactivate']);
    categories = jasmine.createSpyObj<CategoryService>('CategoryService', ['list']);
    categories.list.and.returnValue(of([category]));
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('does not call the API while the form is invalid', () => {
    const fixture = create();

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(service.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('La référence est obligatoire.');
    expect(fixture.nativeElement.textContent).toContain('La catégorie est obligatoire.');
  });

  it('refuses a price with more than 3 decimals or not positive', () => {
    const component = create().componentInstance;

    component.form.patchValue({ purchasePrice: 10.1234, sellingPrice: 0 });

    expect(component.form.controls.purchasePrice.hasError('maxDecimals')).toBeTrue();
    expect(component.form.controls.sellingPrice.hasError('min')).toBeTrue();
  });

  it('creates a product with its initial quantity, the reference in capitals', () => {
    service.create.and.returnValue(of(existing));
    const component = create().componentInstance;

    fill(component);
    component.submit();

    expect(service.create).toHaveBeenCalledWith({
      reference: 'LAP-002', name: 'Portable Air', description: null, purchasePrice: 1000, sellingPrice: 1250.5,
      minimumStock: 2, categoryId: 1, quantity: 5
    });
    expect(snackBar.open).toHaveBeenCalledWith('Produit créé.', 'OK', jasmine.anything());
    expect(router.navigate).toHaveBeenCalledWith(['/products']);
  });

  it('shows the margin, in red when the product is sold at a loss', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.form.patchValue({ purchasePrice: 100, sellingPrice: 125 });
    expect(component.margin).toEqual({ amount: 25, rate: 25 });

    component.form.patchValue({ sellingPrice: 80 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.negative').textContent).toContain('-20');
  });

  it('loads the product, keeps its stock read-only and sends its version back', () => {
    service.get.and.returnValue(of(existing));
    service.update.and.returnValue(of(existing));
    const component = create('5').componentInstance;

    expect(component.form.controls.quantity.disabled).toBeTrue();
    expect(component.form.controls.name.value).toBe('Portable Pro');

    component.form.patchValue({ sellingPrice: 2200, status: 'INACTIVE' });
    component.submit();

    const [id, payload] = service.update.calls.mostRecent().args;
    expect(id).toBe(5);
    expect(payload).toEqual({
      reference: 'LAP-001', name: 'Portable Pro', description: 'Écran 14 pouces', purchasePrice: 1500,
      sellingPrice: 2200, minimumStock: 3, categoryId: 1, status: 'INACTIVE', version: 7
    });
    expect('quantity' in payload).toBeFalse();
  });

  it('shows a duplicate reference under its field', () => {
    service.create.and.returnValue(conflict('Reference already in use: LAP-002'));
    const fixture = create();

    fill(fixture.componentInstance);
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cette référence est déjà utilisée.');
    expect(fixture.componentInstance.saving).toBeFalse();
  });

  it('asks to reload when someone else saved the product in the meantime', () => {
    service.get.and.returnValue(of(existing));
    service.update.and.returnValue(conflict('Product was modified by someone else: reload it and try again'));
    const fixture = create('5');

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.form-error').textContent).toContain('modifié entre-temps');
    const reload = fixture.nativeElement.querySelector('.reload-button') as HTMLButtonElement;
    expect(reload).not.toBeNull();

    reload.click();
    fixture.detectChanges();

    expect(service.get).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.stale).toBeFalse();
  });

  it('says when the product does not exist', () => {
    service.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = create('42');

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Produit introuvable.');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
