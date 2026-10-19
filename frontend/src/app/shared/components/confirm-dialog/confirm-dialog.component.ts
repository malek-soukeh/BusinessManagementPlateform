import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  /** Colors the confirm button as a warning (deactivation, cancellation...). */
  destructive?: boolean;
}

/** Asks the user to confirm a sensitive action. Closes with true when confirmed, false otherwise. */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" class="cancel-button" [mat-dialog-close]="false">Annuler</button>
      <button
        mat-flat-button
        type="button"
        class="confirm-button"
        [color]="data.destructive ? 'warn' : 'primary'"
        [mat-dialog-close]="true"
        cdkFocusInitial
      >
        {{ data.confirmLabel ?? 'Confirmer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: ['.message { margin: 0; }']
})
export class ConfirmDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: ConfirmDialogData) {}
}