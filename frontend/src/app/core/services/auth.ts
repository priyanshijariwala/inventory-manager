import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private tokenExpiryTimer: ReturnType<typeof setTimeout> | null = null;

  user = signal<any>(null);

  login(data: any) {
    return this.http.post(`${environment.apiUrl}/auth/login`, data)
      .pipe(
        tap((res: any) => {
          localStorage.setItem('token', res.accessToken);
          // try to parse user from token payload and store in localStorage
          try {
            const token = res.accessToken;
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              localStorage.setItem('currentUser', JSON.stringify(payload));
              this.user.set(payload);
            } else if (res.user) {
              localStorage.setItem('currentUser', JSON.stringify(res.user));
              this.user.set(res.user);
            }
          } catch (e) {
            // ignore parse errors
          }
          this.startAutoLogoutTimer();
        })
      );
  }

  register(data: any) {
    return this.http.post(`${environment.apiUrl}/users`, data);
  }

  logout(redirect = false, message?: string) {
    this.clearAutoLogoutTimer();
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.user.set(null);
    if (message) {
      try {
        this.toastr.warning(message, 'Session');
      } catch (e) {
        // ignore toastr errors in environments without UI
      }
    }
    if (redirect) {
      this.router.navigate(['/']);
    }
  }

  initAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    if (this.isTokenExpired()) {
      this.logout(true, 'Your session has expired. Please login again.');
      return;
    }

    this.startAutoLogoutTimer();
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return !!token && !this.isTokenExpired();
  }

  getCurrentUser() {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fall through to token parsing
      }
    }

    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        return JSON.parse(atob(tokenParts[1]));
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  getTokenExpirationDate(): Date | null {
    const payload = this.getCurrentUser();
    if (payload?.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  }

  isTokenExpired(): boolean {
    const expirationDate = this.getTokenExpirationDate();
    return !expirationDate || expirationDate.getTime() <= Date.now();
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  private startAutoLogoutTimer() {
    this.clearAutoLogoutTimer();

    const expirationDate = this.getTokenExpirationDate();
    if (!expirationDate) {
      return;
    }

    const expiryMs = expirationDate.getTime() - Date.now();
    if (expiryMs <= 0) {
      this.logout(true, 'Your session has expired. Please login again.');
      return;
    }

    this.tokenExpiryTimer = window.setTimeout(() => {
      this.logout(true, 'Your session has expired. Please login again.');
    }, expiryMs);
  }

  private clearAutoLogoutTimer() {
    if (this.tokenExpiryTimer) {
      clearTimeout(this.tokenExpiryTimer);
      this.tokenExpiryTimer = null;
    }
  }
}
