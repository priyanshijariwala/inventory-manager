import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { ToastrService } from 'ngx-toastr';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const toastr = inject(ToastrService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout(true, 'Your session has expired. Please login again.');
      } else if (error.status === 403) {
        const msg = error?.error?.message || 'You are not authorized to perform this action.';
        try {
          toastr.error(msg, 'Forbidden');
        } catch (e) {
          // ignore toastr errors
        }
      }
      return throwError(() => error);
    })
  );
};
