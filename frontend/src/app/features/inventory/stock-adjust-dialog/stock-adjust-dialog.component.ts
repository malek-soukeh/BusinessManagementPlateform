import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Product } from '../../../core/models/product.models';
import { MAX_STOCK_CHANGE, StockMovement } from '../../../core/models/stock.models';
import { InventoryService } from '../../../core/services/inventory.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';
import { integer } from '../../../shared/validators';

export interface StockAdjustDialogData {
  product: Pick<Product, 'id' | 'name' | 'reference' | 'quantity'>;
}

type Direction = 'IN' | 'OUT';

/** Text that is not only spaces (the API trims the note and refuses a blank one). */
function notBlank(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;
}

/**
 * Manual stock correction (ADMIN and MANAGER). Closes with the recorded movement, or nothing when cancelled.
 * An exit larger than the stock is refused here already; the API checks it again.
 */
@Component({
  selector: 'app-stock-adjust-dialog',
  templateUrl: './stock-adjust-dialog.component.html',
  styleUrls: ['./stock-adjust-dialog.component.scss']
})
export class StockAdjustDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly inventory = inject(InventoryService);
  private readonly dialogRef = inject<MatDialogRef<StockAdjustDialogComponent, StockMovement>>(MatDialogRef);
  readonly data = inject<StockAdjustDialogData>(MAT_DIALOG_DATA);

  readonly maxChange = MAX_STOCK_CHANGE;
  saving = false;
  errorMessage: string | null = null;

  readonly form = this.fb.group({
    direction: this.fb.nonNullable.control<Direction>('IN'),
    quantity: this.fb.control<number | null>(null, [
      Validators.required, Validators.min(1), Validators.max(MAX_STOCK_CHANGE), integer
    ]),
    note: this.fb.nonNullable.control('', [Validators.required, notBlank, Validators.maxLength(255)])
  }, { validators: control => this.checkStock(control) });

  /** Signed change: positive for an entry, negative for an exit. */
  get change(): number {
    const { direction, quantity } = this.form.getRawValue();
    const amount = Number(quantity) || 0;
    return direction === 'OUT' ? -amount : amount;
  }

  get quantityAfter(): number {
    return this.data.product.quantity + this.change;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.errorMessage = null;
    this.inventory
      .adjust(this.data.product.id, { quantityChange: this.change, note: this.form.getRawValue().note.trim() })
      .subscribe({
        next: movement => this.dialogRef.close(movement),
        error: (error: unknown) => {
          this.saving = false;
          this.errorMessage = extractErrorMessage(error, 'Ajustement impossible. Réessayez plus tard.');
        }
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private checkStock(group: AbstractControl): ValidationErrors | null {
    const direction = group.get('direction')?.value as Direction;
    const quantity = Number(group.get('quantity')?.value) || 0;
    return direction === 'OUT' && quantity > this.data.product.quantity ? { insufficient: true } : null;
  }
}
