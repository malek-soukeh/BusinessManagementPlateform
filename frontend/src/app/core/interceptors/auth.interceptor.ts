import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Adds the JWT to the calls made to our own API, and only to them. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token;
  const isApiCall = request.url.startsWith(environment.apiUrl);
  const isLogin = request.url.endsWith('/auth/login');

  if (!token || !isApiCall || isLogin) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
