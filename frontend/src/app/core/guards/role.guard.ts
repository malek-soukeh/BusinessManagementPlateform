import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

/**
 * Restricts a route to some roles, e.g. `canActivate: [roleGuard(['ADMIN'])]`.
 * This only improves the experience: the real protection is done by the API.
 */
export const roleGuard = (allowedRoles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.hasAnyRole(allowedRoles) ? true : router.createUrlTree(['/dashboard']);
};
