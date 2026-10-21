import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { Role } from '../../../core/models/auth.models';
import {
  PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, ROLES, ROLE_DESCRIPTIONS, User
} from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { apiMessage, extractErrorMessage } from '../../../core/utils/http-error.util';
import { ROLE_LABELS } from '../../../layout/nav-items';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string;
  const confirmation = group.get('confirmation')?.value as string;
  return confirmation && password !== confirmation ? { mismatch: true } : null;
}

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly roles = ROLES;
  readonly passwordMin = PASSWORD_MIN_LENGTH;
  readonly passwordMax = PASSWORD_MAX_LENGTH;

  userId: number | null = null;
  loading = false;
  saving = false;
  loadError: string | null = null;
  errorMessage: string | null = null;
  showPassword = false;
  /** The administrator edits his own account: the API refuses a change of his email or his role. */
  isSelf = false;

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: ['', [Validators.maxLength(20)]],
    role: ['EMPLOYEE' as Role, [Validators.required]],
    password: ['', [
      Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(PASSWORD_MAX_LENGTH)
    ]],
    confirmation: ['', [Validators.required]]
  }, { validators: passwordsMatch });

  get isEdit(): boolean {
    return this.userId !== null;
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  roleDescription(role: Role): string {
    return ROLE_DESCRIPTIONS[role];
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === null) {
      return;
    }
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      this.loadError = 'Utilisateur introuvable.';
      return;
    }
    this.userId = parsed;
    // The API has no password change: the password is only typed at creation.
    this.form.controls.password.disable();
    this.form.controls.confirmation.disable();
    this.load(parsed);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const phone = value.phone.trim();
    const common = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim().toLowerCase(),
      phone: phone === '' ? null : phone,
      role: value.role
    };

    this.saving = true;
    this.errorMessage = null;
    const request$ = this.userId === null
      ? this.users.create({ ...common, password: value.password })
      : this.users.update(this.userId, common);

    request$.subscribe({
      next: user => {
        this.snackBar.open(
          this.isEdit ? 'Utilisateur mis à jour.' : `Compte de ${user.firstName} ${user.lastName} créé.`,
          'OK', { duration: 4000 });
        this.router.navigate(['/users']);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.showError(error);
      }
    });
  }

  private load(id: number): void {
    this.loading = true;
    this.users.get(id).subscribe({
      next: user => {
        this.fill(user);
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.loadError = error instanceof HttpErrorResponse && error.status === 404
          ? 'Utilisateur introuvable.'
          : extractErrorMessage(error, 'Impossible de charger l\'utilisateur.');
      }
    });
  }

  private fill(user: User): void {
    this.form.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role
    });
    this.isSelf = user.email.toLowerCase() === (this.auth.email ?? '').toLowerCase();
    if (this.isSelf) {
      this.form.controls.email.disable();
      this.form.controls.role.disable();
    }
  }

  /** A duplicate email is shown under its field, any other error above the buttons. */
  private showError(error: unknown): void {
    if (apiMessage(error).startsWith('Email already in use')) {
      this.form.controls.email.setErrors({ taken: true });
      this.form.controls.email.markAsTouched();
      return;
    }
    this.errorMessage = extractErrorMessage(error, 'Enregistrement impossible. Réessayez plus tard.');
  }
}
