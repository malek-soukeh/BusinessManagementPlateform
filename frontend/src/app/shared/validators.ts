import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** At most `decimals` digits after the decimal point (the API stores amounts with 3 decimals). */
export function maxDecimals(decimals: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const [, fraction = ''] = String(value).split('.');
    return fraction.length > decimals ? { maxDecimals: { max: decimals } } : null;
  };
}

/** A whole number (no decimal part). */
export function integer(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return Number.isInteger(Number(value)) ? null : { integer: true };
}
