import { Component, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, filter, switchMap } from 'rxjs';

import { Role } from '../../../core/models/auth.models';
import { User } from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { apiMessage, extractErrorMessage } from '../../../core/utils/http-error.util';
import { ROLE_LABELS } from '../../../layout/nav-items';
import {
  ConfirmDialogComponent, ConfirmDialogData
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

const ROLE_TONES: Record<Role, string> = { ADMIN: 'tone-danger', MANAGER: 'tone-info', EMPLOYEE: 'tone-muted' };

/** User accounts (ADMIN only). The API has neither search nor filter on this list. */
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = ['name', 'email', 'role', 'status', 'createdAt', 'actions'];
  readonly skeletonRows = [0, 1, 2, 3];

  rows: User[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  loading = true;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;
    this.users.list(this.pageIndex, this.pageSize).subscribe({
      next: page => {
        this.rows = page.content;
        this.total = page.totalElements;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = extractErrorMessage(error, 'Impossible de charger les utilisateurs.');
      }
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  /** The API forbids an administrator to deactivate or delete his own account. */
  isSelf(user: User): boolean {
    return user.email.toLowerCase() === (this.auth.email ?? '').toLowerCase();
  }

  initials(user: User): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  roleTone(role: Role): string {
    return ROLE_TONES[role];
  }

  deactivate(user: User): void {
    this.confirmThen({
      title: 'Désactiver l\'utilisateur',
      message: `${user.firstName} ${user.lastName} ne pourra plus se connecter. Son historique est conservé `
        + 'et le compte peut être réactivé à tout moment.',
      confirmLabel: 'Désactiver',
      destructive: true
    }, () => this.users.updateStatus(user.id, 'INACTIVE'), 'Utilisateur désactivé.', 'Désactivation impossible.');
  }

  reactivate(user: User): void {
    this.users.updateStatus(user.id, 'ACTIVE').subscribe({
      next: () => {
        this.notify('Utilisateur réactivé.');
        this.load();
      },
      error: (error: unknown) => this.notify(extractErrorMessage(error, 'Réactivation impossible.'))
    });
  }

  delete(user: User): void {
    this.confirmThen({
      title: 'Supprimer l\'utilisateur',
      message: `Le compte de ${user.firstName} ${user.lastName} sera définitivement supprimé. `
        + 'Un utilisateur qui a déjà créé des commandes ou des mouvements ne peut pas être supprimé : '
        + 'désactivez-le plutôt.',
      confirmLabel: 'Supprimer',
      destructive: true
    }, () => this.users.delete(user.id), 'Utilisateur supprimé.', 'Suppression impossible.', user);
  }

  private confirmThen(
    data: ConfirmDialogData, action: () => Observable<unknown>, success: string, failure: string, deleted?: User
  ): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data })
      .afterClosed()
      .pipe(filter(confirmed => confirmed === true), switchMap(action))
      .subscribe({
        next: () => {
          this.notify(success);
          this.load();
        },
        error: (error: unknown) => {
          // A user linked to records cannot be deleted: deactivating is offered right away.
          if (deleted && apiMessage(error).startsWith('User is linked to existing records')) {
            this.snackBar
              .open(extractErrorMessage(error), 'Désactiver', { duration: 8000 })
              .onAction()
              .pipe(switchMap(() => this.users.updateStatus(deleted.id, 'INACTIVE')))
              .subscribe({
                next: () => {
                  this.notify('Utilisateur désactivé.');
                  this.load();
                },
                error: (statusError: unknown) => this.notify(extractErrorMessage(statusError, 'Désactivation impossible.'))
              });
            return;
          }
          this.notify(extractErrorMessage(error, failure));
        }
      });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 4000 });
  }
}
