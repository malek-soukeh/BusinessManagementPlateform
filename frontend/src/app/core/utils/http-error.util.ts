import { HttpErrorResponse } from '@angular/common/http';

import { translateApiMessage } from './api-messages';

/** Messages shown when the API message is missing or not translated yet. */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Les données envoyées sont invalides. Vérifiez le formulaire.',
  401: 'Votre session a expiré. Veuillez vous reconnecter.',
  403: 'Vous n\'avez pas les droits nécessaires pour cette action.',
  404: 'Élément introuvable : il a peut-être été supprimé.'
};

/** Turns any error into a French message that can be shown to the user. */
export function extractErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Serveur injoignable. Vérifiez votre connexion.';
    }
    const message = (error.error as { message?: string } | null)?.message;
    const translated = message ? translateApiMessage(message) : null;
    return translated ?? STATUS_MESSAGES[error.status] ?? fallback;
  }
  return fallback;
}

/** The raw (English) message of an API error, to recognize a specific business error. */
export function apiMessage(error: unknown): string {
  return error instanceof HttpErrorResponse ? (error.error as { message?: string } | null)?.message ?? '' : '';
}
