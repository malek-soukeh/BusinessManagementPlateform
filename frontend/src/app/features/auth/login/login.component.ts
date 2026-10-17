import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  hidePassword = true;
  loading = false;
  errorMessage: string | null = null;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.router.navigateByUrl(this.returnUrl());
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = this.messageFor(error);
      }
    });
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'Email ou mot de passe incorrect.';
    }
    return extractErrorMessage(error, 'Connexion impossible. Réessayez plus tard.');
  }

  /** Only local paths are accepted, so a crafted link cannot redirect to another site. */
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/dashboard';
  }
}
