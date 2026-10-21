import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';

import { Page } from '../../../core/models/page.models';
import { User } from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SharedModule } from '../../../shared/shared.module';
import { clickRowMenuItem, openRowMenu } from '../../../testing/menu.helpers';
import { UserListComponent } from './user-list.component';

describe('UserListComponent', () => {
  const user = (id: number, changes: Partial<User> = {}): User => ({
    id, firstName: 'Leila', lastName: `Ben Salah ${id}`, email: `user${id}@techdistrib.tn`, phone: null,
    role: 'EMPLOYEE', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...changes
  });
  const admin = user(1, { firstName: 'System', lastName: 'Admin', email: 'Admin@techdistrib.tn', role: 'ADMIN' });
  const page = (users: User[]): Page<User> => ({ content: users, page: 0, size: 10, totalElements: users.length, totalPages: 1 });

  let service: jasmine.SpyObj<UserService>;
  let dialog: { open: jasmine.Spy };
  let snackBar: { open: jasmine.Spy };

  function create(): ComponentFixture<UserListComponent> {
    TestBed.configureTestingModule({
      declarations: [UserListComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: UserService, useValue: service },
        { provide: AuthService, useValue: { email: 'admin@techdistrib.tn' } },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    });
    const fixture = TestBed.createComponent(UserListComponent);
    fixture.detectChanges();
    return fixture;
  }

  const row = (fixture: ComponentFixture<UserListComponent>, index: number) =>
    fixture.nativeElement.querySelectorAll('tr[mat-row]')[index] as HTMLElement;

  beforeEach(() => {
    service = jasmine.createSpyObj<UserService>('UserService', ['list', 'get', 'create', 'update', 'updateStatus', 'delete']);
    service.list.and.returnValue(of(page([admin, user(2), user(3, { status: 'INACTIVE', role: 'MANAGER' })])));
    dialog = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(true) }) };
    snackBar = { open: jasmine.createSpy('open') };
  });

  it('lists the accounts with their role and status in French', () => {
    const fixture = create();

    expect(service.list).toHaveBeenCalledWith(0, 10);
    expect(fixture.nativeElement.querySelectorAll('tr[mat-row]').length).toBe(3);
    expect(row(fixture, 0).textContent).toContain('Administrateur');
    expect(row(fixture, 2).textContent).toContain('Manager');
    expect(row(fixture, 2).textContent).toContain('Inactif');
  });

  it('marks the own account and offers neither deactivation nor deletion on it', () => {
    const fixture = create();

    expect(row(fixture, 0).textContent).toContain('Vous');
    expect(openRowMenu(fixture, 0).querySelector('.deactivate-button')).toBeNull();
    expect(openRowMenu(fixture, 0).querySelector('.delete-button')).toBeNull();
    expect(openRowMenu(fixture, 1).querySelector('.deactivate-button')).not.toBeNull();
  });

  it('deactivates after a destructive confirmation', () => {
    service.updateStatus.and.returnValue(of(user(2, { status: 'INACTIVE' })));
    const fixture = create();

    clickRowMenuItem(fixture, 1, 'deactivate-button');

    expect(dialog.open.calls.mostRecent().args[1].data.destructive).toBeTrue();
    expect(service.updateStatus).toHaveBeenCalledWith(2, 'INACTIVE');
    expect(snackBar.open).toHaveBeenCalledWith('Utilisateur désactivé.', 'OK', jasmine.anything());
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('reactivates an inactive user', () => {
    service.updateStatus.and.returnValue(of(user(3)));
    const fixture = create();

    clickRowMenuItem(fixture, 2, 'reactivate-button');

    expect(service.updateStatus).toHaveBeenCalledWith(3, 'ACTIVE');
  });

  it('deletes after a destructive confirmation', () => {
    service.delete.and.returnValue(of(undefined));
    const fixture = create();

    clickRowMenuItem(fixture, 1, 'delete-button');

    expect(service.delete).toHaveBeenCalledWith(2);
    expect(snackBar.open).toHaveBeenCalledWith('Utilisateur supprimé.', 'OK', jasmine.anything());
  });

  it('does nothing when the confirmation is refused', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) });
    const fixture = create();

    clickRowMenuItem(fixture, 1, 'delete-button');

    expect(service.delete).not.toHaveBeenCalled();
  });

  it('offers to deactivate a user who cannot be deleted', () => {
    const action = new Subject<void>();
    snackBar.open.and.returnValue({ onAction: () => action });
    service.delete.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { message: 'User is linked to existing records and cannot be deleted: deactivate it instead' }
    })));
    service.updateStatus.and.returnValue(of(user(2, { status: 'INACTIVE' })));
    const fixture = create();

    clickRowMenuItem(fixture, 1, 'delete-button');

    expect(snackBar.open).toHaveBeenCalledWith(
      'Cet utilisateur est lié à des enregistrements : désactivez-le plutôt.', 'Désactiver', jasmine.anything());

    action.next();

    expect(service.updateStatus).toHaveBeenCalledWith(2, 'INACTIVE');
  });

  it('pages the accounts on the server', () => {
    const fixture = create();

    fixture.componentInstance.onPage({ pageIndex: 1, pageSize: 20, length: 30 });

    expect(service.list).toHaveBeenCalledWith(1, 20);
  });

  it('shows the error and reloads on demand', () => {
    service.list.and.returnValues(throwError(() => new HttpErrorResponse({ status: 0 })), of(page([admin])));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Serveur injoignable');

    (fixture.nativeElement.querySelector('.error-panel button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tr[mat-row]').length).toBe(1);
  });
});
