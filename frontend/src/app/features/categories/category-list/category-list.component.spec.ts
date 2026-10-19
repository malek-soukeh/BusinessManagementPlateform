import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Category } from '../../../core/models/category.models';
import { CategoryService } from '../../../core/services/category.service';
import { SharedModule } from '../../../shared/shared.module';
import { CategoryListComponent } from './category-list.component';

describe('CategoryListComponent', () => {
  const category = (id: number, name: string, parentId: number | null = null): Category => ({
    id, name, description: id === 1 ? 'Matériel informatique' : null, parentId, parentName: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  });
  const categories = [
    category(1, 'Informatique'),
    category(2, 'Ordinateurs', 1),
    category(3, 'Électroménager')
  ];

  let service: jasmine.SpyObj<CategoryService>;
  let dialog: { open: jasmine.Spy };
  let snackBar: { open: jasmine.Spy };

  function create(): ComponentFixture<CategoryListComponent> {
    TestBed.configureTestingModule({
      declarations: [CategoryListComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: CategoryService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    });
    const fixture = TestBed.createComponent(CategoryListComponent);
    fixture.detectChanges();
    return fixture;
  }

  const names = (fixture: ComponentFixture<CategoryListComponent>) =>
    Array.from<Element>(fixture.nativeElement.querySelectorAll('.category-name'))
      .map(element => element.textContent?.trim());

  const deleteButtons = (fixture: ComponentFixture<CategoryListComponent>) =>
    fixture.nativeElement.querySelectorAll('.delete-button') as NodeListOf<HTMLButtonElement>;

  beforeEach(() => {
    service = jasmine.createSpyObj<CategoryService>('CategoryService', ['list', 'get', 'create', 'update', 'delete']);
    service.list.and.returnValue(of(categories));
    dialog = { open: jasmine.createSpy('open') };
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('shows the categories as a tree', () => {
    const fixture = create();

    expect(names(fixture)).toEqual(['Électroménager', 'Informatique', 'Ordinateurs']);
    expect(fixture.nativeElement.textContent).toContain('Matériel informatique');
    expect(fixture.nativeElement.textContent).toContain('3 catégorie(s)');
  });

  it('searches without accents nor case, after a pause in typing', fakeAsync(() => {
    const fixture = create();

    fixture.componentInstance.search.setValue('ELECTRO');
    tick(299);
    fixture.detectChanges();
    expect(names(fixture).length).toBe(3);

    tick(1);
    fixture.detectChanges();
    expect(names(fixture)).toEqual(['Électroménager']);
  }));

  it('finds a sub-category by the name of its parent and shows its path', fakeAsync(() => {
    const fixture = create();

    fixture.componentInstance.search.setValue('informatique');
    tick(300);
    fixture.detectChanges();

    expect(names(fixture)).toEqual(['Informatique', 'Ordinateurs']);
    expect(fixture.nativeElement.textContent).toContain('Informatique › Ordinateurs');
    flush();
  }));

  it('filters the main categories or the sub-categories', () => {
    const fixture = create();

    fixture.componentInstance.onLevelChange('sub');
    fixture.detectChanges();
    expect(names(fixture)).toEqual(['Ordinateurs']);

    fixture.componentInstance.onLevelChange('root');
    fixture.detectChanges();
    expect(names(fixture)).toEqual(['Électroménager', 'Informatique']);
  });

  it('pages the categories on the client side', () => {
    service.list.and.returnValue(of(Array.from({ length: 12 }, (_, i) => category(i + 10, `Catégorie ${i + 10}`))));
    const fixture = create();

    expect(names(fixture).length).toBe(10);

    fixture.componentInstance.onPage({ pageIndex: 1, pageSize: 10, length: 12 });
    fixture.detectChanges();
    expect(names(fixture)).toEqual(['Catégorie 20', 'Catégorie 21']);
  });

  it('does not offer to delete a category that has sub-categories', () => {
    const fixture = create();

    const buttons = deleteButtons(fixture);
    expect(buttons[0].disabled).toBeFalse();
    expect(buttons[1].disabled).toBeTrue();
    expect(buttons[2].disabled).toBeFalse();
  });

  it('deletes after confirmation and reloads', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) });
    service.delete.and.returnValue(of(undefined));
    const fixture = create();

    deleteButtons(fixture)[0].click();

    expect(dialog.open).toHaveBeenCalled();
    expect(service.delete).toHaveBeenCalledWith(3);
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(snackBar.open).toHaveBeenCalledWith('Catégorie supprimée.', 'OK', jasmine.anything());
  });

  it('does nothing when the deletion is cancelled', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) });
    const fixture = create();

    deleteButtons(fixture)[0].click();

    expect(service.delete).not.toHaveBeenCalled();
  });

  it('explains in French why a category cannot be deleted', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) });
    service.delete.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Category is used by products and cannot be deleted' }
    })));
    const fixture = create();

    deleteButtons(fixture)[0].click();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Cette catégorie est utilisée par des produits : elle ne peut pas être supprimée.', 'OK', jasmine.anything());
  });

  it('shows the error and reloads on demand', () => {
    service.list.and.returnValues(throwError(() => new HttpErrorResponse({ status: 0 })), of(categories));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Serveur injoignable');

    fixture.nativeElement.querySelector('.error-panel button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-panel')).toBeNull();
    expect(names(fixture).length).toBe(3);
  });

  it('says when there is no category yet', () => {
    service.list.and.returnValue(of([]));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.empty').textContent).toContain('Aucune catégorie pour le moment.');
  });
});
