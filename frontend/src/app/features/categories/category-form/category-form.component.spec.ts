import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Category } from '../../../core/models/category.models';
import { CategoryService } from '../../../core/services/category.service';
import { SharedModule } from '../../../shared/shared.module';
import { CategoryFormComponent } from './category-form.component';

describe('CategoryFormComponent', () => {
  const category = (id: number, name: string, parentId: number | null = null): Category => ({
    id, name, description: null, parentId, parentName: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  });
  const all = [category(1, 'Informatique'), category(2, 'Ordinateurs', 1), category(3, 'Portables', 2), category(4, 'Bureautique')];

  let service: jasmine.SpyObj<CategoryService>;
  let router: Router;
  let snackBar: { open: jasmine.Spy };

  function create(options: { id?: string; parent?: string } = {}): ComponentFixture<CategoryFormComponent> {
    TestBed.configureTestingModule({
      declarations: [CategoryFormComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: CategoryService, useValue: service },
        { provide: MatSnackBar, useValue: snackBar },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(options.id ? { id: options.id } : {}),
              queryParamMap: convertToParamMap(options.parent ? { parent: options.parent } : {})
            }
          }
        }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(CategoryFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  const conflict = (message: string) => throwError(() => new HttpErrorResponse({ status: 409, error: { message } }));

  beforeEach(() => {
    service = jasmine.createSpyObj<CategoryService>('CategoryService', ['list', 'get', 'create', 'update', 'delete']);
    service.list.and.returnValue(of(all));
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('does not call the API while the form is invalid', () => {
    const fixture = create();

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(service.create).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Le nom est obligatoire.');
  });

  it('creates a category, trimmed, with a blank description sent as null', () => {
    service.create.and.returnValue(of(category(9, 'Écrans', 1)));
    const component = create().componentInstance;

    component.form.setValue({ name: '  Écrans ', description: '   ', parentId: 1 });
    component.submit();

    expect(service.create).toHaveBeenCalledWith({ name: 'Écrans', description: null, parentId: 1 });
    expect(snackBar.open).toHaveBeenCalledWith('Catégorie créée.', 'OK', jasmine.anything());
    expect(router.navigate).toHaveBeenCalledWith(['/categories']);
  });

  it('preselects the parent asked by the list', () => {
    const component = create({ parent: '2' }).componentInstance;

    expect(component.form.controls.parentId.value).toBe(2);
  });

  it('ignores a parent that does not exist', () => {
    const component = create({ parent: '99' }).componentInstance;

    expect(component.form.controls.parentId.value).toBeNull();
  });

  it('loads the category and never offers itself or its sub-categories as parent', () => {
    service.get.and.returnValue(of(all[1]));
    const component = create({ id: '2' }).componentInstance;

    expect(service.get).toHaveBeenCalledWith(2);
    expect(component.form.getRawValue()).toEqual({ name: 'Ordinateurs', description: '', parentId: 1 });
    expect(component.parentOptions.map(node => node.category.name)).toEqual(['Bureautique', 'Informatique']);
  });

  it('updates the category', () => {
    service.get.and.returnValue(of(all[1]));
    service.update.and.returnValue(of(all[1]));
    const component = create({ id: '2' }).componentInstance;

    component.form.patchValue({ parentId: 4 });
    component.submit();

    expect(service.update).toHaveBeenCalledWith(2, { name: 'Ordinateurs', description: null, parentId: 4 });
    expect(snackBar.open).toHaveBeenCalledWith('Catégorie mise à jour.', 'OK', jasmine.anything());
  });

  it('shows a duplicate name under the name field', () => {
    service.create.and.returnValue(conflict('Category name already in use: Informatique'));
    const fixture = create();

    fixture.componentInstance.form.patchValue({ name: 'Informatique' });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.name.hasError('taken')).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Ce nom de catégorie est déjà utilisé.');
    expect(fixture.componentInstance.saving).toBeFalse();
  });

  it('shows a cycle under the parent field', () => {
    service.get.and.returnValue(of(all[0]));
    service.update.and.returnValue(conflict('A category cannot be its own parent or a descendant of itself'));
    const component = create({ id: '1' }).componentInstance;

    component.submit();

    expect(component.form.controls.parentId.hasError('cycle')).toBeTrue();
  });

  it('shows any other error in French above the buttons', () => {
    service.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: {} })));
    const fixture = create();

    fixture.componentInstance.form.patchValue({ name: 'Écrans' });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.form-error').textContent).toContain('droits');
  });

  it('says when the category does not exist', () => {
    service.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = create({ id: '42' });

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Catégorie introuvable.');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
