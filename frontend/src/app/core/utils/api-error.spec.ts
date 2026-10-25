import { HttpErrorResponse } from '@angular/common/http';

import { translateApiError } from './api-messages';
import { apiErrorCode, extractErrorMessage } from './http-error.util';

const failure = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

describe('apiErrorCode', () => {
  it('reads the code sent by the API', () => {
    expect(apiErrorCode(failure(409, { code: 'EMAIL_ALREADY_USED', message: 'x' }))).toBe('EMAIL_ALREADY_USED');
  });

  it('prefers the code to the message', () => {
    expect(apiErrorCode(failure(409, { code: 'CONFLICT', message: 'Email already in use: a@b.tn' }))).toBe('CONFLICT');
  });

  it('recognizes a known message sent without a code', () => {
    expect(apiErrorCode(failure(409, { message: 'Reference already in use: LAP-001' }))).toBe('REFERENCE_ALREADY_USED');
    expect(apiErrorCode(failure(409, { message: 'Category name already in use' }))).toBe('CATEGORY_NAME_ALREADY_USED');
  });

  it('is null for an unknown message, a body without message or something else than an HTTP error', () => {
    expect(apiErrorCode(failure(500, { message: 'Boom' }))).toBeNull();
    expect(apiErrorCode(failure(500, null))).toBeNull();
    expect(apiErrorCode(new Error('boom'))).toBeNull();
  });
});

describe('translateApiError', () => {
  it('uses the details of the message', () => {
    expect(translateApiError('EMAIL_ALREADY_USED', 'Email already in use: a@b.tn'))
      .toBe('L\'email a@b.tn est déjà utilisé.');
    expect(translateApiError('INVALID_ORDER_TRANSITION', 'Cannot change order status from SHIPPED to CANCELLED'))
      .toContain('expédiée');
  });

  it('still translates when the message changed and no longer matches', () => {
    expect(translateApiError('INSUFFICIENT_STOCK', 'Not enough items')).toBe('Stock insuffisant.');
    expect(translateApiError('EMAIL_ALREADY_USED', 'Another wording')).toBe('Cet email est déjà utilisé.');
    expect(translateApiError('USER_HAS_RECORDS', 'Another wording')).toContain('désactivez-le');
  });

  it('falls back on the message when the code has no sentence of its own', () => {
    expect(translateApiError('CONFLICT', 'Insufficient stock: available 2, requested change -5')).toContain('Stock insuffisant');
    expect(translateApiError(null, 'Category not found with id 9')).toContain('introuvable');
  });

  it('is null when neither the code nor the message is known', () => {
    expect(translateApiError('CONFLICT', 'Something new')).toBeNull();
    expect(translateApiError(undefined, 'Something new')).toBeNull();
  });
});

describe('extractErrorMessage with codes', () => {
  it('translates from the code', () => {
    expect(extractErrorMessage(failure(409, { code: 'CUSTOMER_INACTIVE', message: 'Customer is inactive' })))
      .toBe('Ce client est inactif.');
  });

  it('keeps the generic message of the status when nothing is known', () => {
    expect(extractErrorMessage(failure(404, { code: 'RESOURCE_NOT_FOUND', message: 'Category not found' })))
      .toContain('introuvable');
    expect(extractErrorMessage(failure(409, { code: 'CONFLICT', message: 'Something new' }), 'Échec.')).toBe('Échec.');
  });
});
