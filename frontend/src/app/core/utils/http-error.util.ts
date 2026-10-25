import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorCode } from '../models/api-error.models';
import { codeFromMessage, translateApiError } from './api-messages';

/** Messages shown when the API error is missing or not translated yet. */
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
    const translated = translateApiError(body(error).code, apiMessage(error));
    return translated ?? STATUS_MESSAGES[error.status] ?? fallback;
  }
  return fallback;
}

/** The raw (English) message of an API error, only useful for its details (name, reference...). */
export function apiMessage(error: unknown): string {
  return error instanceof HttpErrorResponse ? body(error).message ?? '' : '';
}

/**
 * The stable code of an API error, to recognize a specific business error.
 * An error sent without a code is recognized from its English message; null when unknown.
 */
export function apiErrorCode(error: unknown): ApiErrorCode | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const { code, message } = body(error);
  if (typeof code === 'string' && code !== '') {
    return code as ApiErrorCode;
  }
  return message ? codeFromMessage(message) : null;
}

function body(error: HttpErrorResponse): { code?: string; message?: string } {
  const content = error.error as { code?: unknown; message?: unknown } | null;
  return {
    code: typeof content?.code === 'string' ? content.code : undefined,
    message: typeof content?.message === 'string' ? content.message : undefined
  };
}
