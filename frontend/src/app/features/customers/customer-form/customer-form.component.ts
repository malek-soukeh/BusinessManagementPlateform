import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { CustomerPayload, CustomerStatus } from '../../../core/models/customer.models';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerService } from '../../../core/services/customer.service';
import { extractErrorMessage, apiErrorCode } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-customer-form',
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss']
})
export class CustomerFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customers = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  /** Administrators and managers may change the status of an existing customer. */
  readonly canChangeStatus = this.auth.hasAnyRole(['ADMIN', 'MANAGER']);

  customerId: number | null = null;
  loading = false;
  saving = false;
  loadError: string | null = null;
  errorMessage: string | null = null;

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: ['', [Validators.maxLength(20)]],
    company: ['', [Validators.maxLength(150)]],
    address: ['', [Validators.maxLength(255)]],
    taxNumber: ['', [Validators.maxLength(50)]],
    status: ['ACTIVE' as CustomerStatus]
  });

  get isEdit(): boolean {
    return this.customerId !== null;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === null) {
      return;
    }

    const parsed = Number(id);
    if (!Number.isInteger(parsed)) {
      this.loadError = 'Client introuvable.';
      return;
    }
    this.customerId = parsed;
    this.load(parsed);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = null;

    const value = this.form.getRawValue();
    const payload: CustomerPayload = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      phone: this.blankToNull(value.phone),
      address: this.blankToNull(value.address),
      company: this.blankToNull(value.company),
      taxNumber: this.blankToNull(value.taxNumber)
    };

    const request$ = this.customerId === null
      ? this.customers.create(payload)
      : this.customers.update(
          this.customerId,
          this.canChangeStatus ? { ...payload, status: value.status } : payload);

    request$.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit ? 'Client mis à jour.' : 'Client créé.', 'OK', { duration: 4000 });
        this.router.navigate(['/customers']);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.showError(error);
      }
    });
  }

  private load(id: number): void {
    this.loading = true;
    this.customers.get(id).subscribe({
      next: customer => {
        this.form.patchValue({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone ?? '',
          address: customer.address ?? '',
          company: customer.company ?? '',
          taxNumber: customer.taxNumber ?? '',
          status: customer.status
        });
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.loadError = error instanceof HttpErrorResponse && error.status === 404
          ? 'Client introuvable.'
          : extractErrorMessage(error, 'Impossible de charger le client.');
      }
    });
  }

  /** A duplicate email or tax number is shown under its field, any other error above the buttons. */
  private showError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const code = apiErrorCode(error);
      if (code === 'EMAIL_ALREADY_USED') {
        this.form.controls.email.setErrors({ taken: true });
        this.form.controls.email.markAsTouched();
        return;
      }
      if (code === 'TAX_NUMBER_ALREADY_USED') {
        this.form.controls.taxNumber.setErrors({ taken: true });
        this.form.controls.taxNumber.markAsTouched();
        return;
      }
    }
    this.errorMessage = extractErrorMessage(error, 'Enregistrement impossible. Réessayez plus tard.');
  }

  private blankToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
}