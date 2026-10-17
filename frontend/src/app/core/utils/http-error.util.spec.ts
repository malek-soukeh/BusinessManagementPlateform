import { HttpErrorResponse } from '@angular/common/http';

import { extractErrorMessage } from './http-error.util';

describe('extractErrorMessage', () => {
  it('returns the message sent by the API', () => {
    const error = new HttpErrorResponse({ status: 409, error: { message: 'Order already invoiced' } });
    expect(extractErrorMessage(error)).toBe('Order already invoiced');
  });

  it('reports an unreachable server when the status is 0', () => {
    const error = new HttpErrorResponse({ status: 0 });
    expect(extractErrorMessage(error)).toContain('Serveur injoignable');
  });

  it('falls back to the default message otherwise', () => {
    expect(extractErrorMessage(new HttpErrorResponse({ status: 500 }))).toBe('Une erreur est survenue.');
    expect(extractErrorMessage(new Error('boom'), 'Oups')).toBe('Oups');
  });
});
