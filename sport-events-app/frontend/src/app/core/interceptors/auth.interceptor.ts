import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getAccessToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status === 401) {
        const refresh = authService.getRefreshToken();
        if (refresh) {
          return authService.refreshToken(refresh).pipe(
            switchMap((res: any) => {
              authService.saveTokens(res.access, res.refresh);
              const newReq = req.clone({
                setHeaders: { Authorization: `Bearer ${res.access}` }
              });
              return next(newReq);
            }),
            catchError((err) => {
              authService.logout();
              router.navigate(['/login']);
              return throwError(() => err);
            })
          );
        } else {
          authService.logout();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
