import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  user = signal<any>(null);

  login(data: any) {
    return this.http.post(`${environment.apiUrl}/auth/login`, data)
      .pipe(
        tap((res: any) => {
          localStorage.setItem('token', res.accessToken);
        })
      );
  }

  register(data: any) {
    return this.http.post(`${environment.apiUrl}/users`, data);
  }

  logout() {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getCurrentUser() {
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

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }
}
