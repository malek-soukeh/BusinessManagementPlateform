import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/** An expired or rejected token (401) ends the session and sends the user back to the login page. */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLogin = request.url.endsWith('/auth/login');
      if (error.status === 401 && !isLogin) {
        auth.logout();
        const returnUrl = router.url === '/' || router.url.startsWith('/login') ? null : router.url;
        router.navigate(['/login'], { queryParams: returnUrl ? { returnUrl } : {} });
      }
      return throwError(() => error);
    })
  );
};
