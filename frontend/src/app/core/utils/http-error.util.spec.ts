import { HttpErrorResponse } from '@angular/common/http';

import { translateApiMessage } from './api-messages';
import { apiMessage, extractErrorMessage } from './http-error.util';

describe('extractErrorMessage', () => {
  it('translates the message sent by the API', () => {
    const error = new HttpErrorResponse({ status: 409, error: { message: 'Order already invoiced: ORD-2026-00001' } });
    expect(extractErrorMessage(error)).toBe('La commande ORD-2026-00001 est déjà facturée.');
  });

  it('reports an unreachable server when the status is 0', () => {
    const error = new HttpErrorResponse({ status: 0 });
    expect(extractErrorMessage(error)).toContain('Serveur injoignable');
  });

  it('never shows an untranslated message: it uses the status, then the fallback', () => {
    const unknown = { message: 'Something new happened' };
    expect(extractErrorMessage(new HttpErrorResponse({ status: 403, error: unknown }))).toContain('droits');
    expect(extractErrorMessage(new HttpErrorResponse({ status: 409, error: unknown }), 'Oups')).toBe('Oups');
  });

  it('falls back to the default message otherwise', () => {
    expect(extractErrorMessage(new HttpErrorResponse({ status: 500 }))).toBe('Une erreur est survenue.');
    expect(extractErrorMessage(new Error('boom'), 'Oups')).toBe('Oups');
  });

  it('gives access to the raw message to recognize a business error', () => {
    const error = new HttpErrorResponse({ status: 409, error: { message: 'Category name already in use: PC' } });
    expect(apiMessage(error)).toBe('Category name already in use: PC');
    expect(apiMessage(new Error('boom'))).toBe('');
  });
});

describe('translateApiMessage', () => {
  it('translates the business errors with their details', () => {
    expect(translateApiMessage('Category name already in use: Ordinateurs'))
      .toBe('Le nom de catégorie « Ordinateurs » est déjà utilisé.');
    expect(translateApiMessage('Cannot change order status from SHIPPED to CANCELLED'))
      .toBe('Impossible de passer une commande de « expédiée » à « annulée ».');
    expect(translateApiMessage('Insufficient stock for LAP-001: available 2, requested 5'))
      .toBe('Stock insuffisant pour LAP-001 : 2 disponible(s), 5 demandé(s).');
    expect(translateApiMessage('Category not found with id 9')).toContain('introuvable');
  });

  it('returns null for an unknown message', () => {
    expect(translateApiMessage('Something new happened')).toBeNull();
  });
});
