import { HttpErrorResponse } from '@angular/common/http';

/** Turns any error into a message that can be shown to the user. */
export function extractErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Serveur injoignable. Vérifiez votre connexion.';
    }
    const message = (error.error as { message?: string } | null)?.message;
    if (message) {
      return message;
    }
  }
  return fallback;
}
