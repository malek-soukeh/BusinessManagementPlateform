import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { Role, UserProfile } from '../../core/models/auth.models';
import { ROLE_DESCRIPTIONS } from '../../core/models/user.models';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorCode, extractErrorMessage } from '../../core/utils/http-error.util';
import { NavItem, ROLE_LABELS, visibleNavItems } from '../../layout/nav-items';

/** The new password must differ from the current one (the API refuses it too: this only saves a round trip). */
function differsFromCurrent(control: AbstractControl): ValidationErrors | null {
  const current = control.parent?.get('currentPassword')?.value;
  return control.value !== '' && control.value === current ? { sameAsCurrent: true } : null;
}

function matchesNewPassword(control: AbstractControl): ValidationErrors | null {
  return control.parent && control.value !== control.parent.get('newPassword')?.value ? { mismatch: true } : null;
}

/**
 * Profile of the logged-in user. The personal data is read-only (an administrator changes it from
 * the users page); the password is changed here, after asking for the current one.
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  profile: UserProfile | null = null;
  loading = true;
  errorMessage: string | null = null;
  /** The pages the role may open, as in the menu. */
  readonly pages: NavItem[] = visibleNavItems(this.auth.role).filter(item => item.route !== '/dashboard');
  readonly expiresAt = this.auth.expiresAt;

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72), differsFromCurrent]],
    confirmPassword: ['', [Validators.required, matchesNewPassword]]
  });
  savingPassword = false;
  passwordError: string | null = null;

  get initials(): string {
    const profile = this.profile;
    return profile ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() : '';
  }

  ngOnInit(): void {
    this.load();
    // A rule that compares two fields must be checked again when the other one changes.
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.controls;
    currentPassword.valueChanges.subscribe(() => newPassword.updateValueAndValidity({ emitEvent: false }));
    newPassword.valueChanges.subscribe(() => confirmPassword.updateValueAndValidity({ emitEvent: false }));
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;
    this.auth.me().subscribe({
      next: profile => {
        this.profile = profile;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = extractErrorMessage(error, 'Impossible de charger votre profil.');
      }
    });
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  roleDescription(role: Role): string {
    return ROLE_DESCRIPTIONS[role];
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.savingPassword = true;
    this.passwordError = null;
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordForm.reset();
        this.snackBar.open('Mot de passe modifié.', 'OK', { duration: 4000 });
      },
      error: (error: unknown) => {
        this.savingPassword = false;
        this.showPasswordError(error);
      }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  /** A wrong current password or an identical new one is shown under its field, any other error above the button. */
  private showPasswordError(error: unknown): void {
    const { currentPassword, newPassword } = this.passwordForm.controls;
    const code = apiErrorCode(error);
    if (code === 'INVALID_CURRENT_PASSWORD') {
      currentPassword.setErrors({ incorrect: true });
      currentPassword.markAsTouched();
      return;
    }
    if (code === 'NEW_PASSWORD_SAME_AS_CURRENT') {
      newPassword.setErrors({ sameAsCurrent: true });
      newPassword.markAsTouched();
      return;
    }
    this.passwordError = extractErrorMessage(error, 'Modification impossible. Réessayez plus tard.');
  }
}
