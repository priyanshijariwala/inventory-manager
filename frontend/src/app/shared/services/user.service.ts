import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../core/services/api';
import { User, UserFilter } from '../models/user.model';
import { BehaviorSubject, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private api = inject(ApiService);
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();

  getUsers(filter?: UserFilter): Observable<any> {
    let url = 'users';
    if (filter) {
      const params = new URLSearchParams();
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.search) params.append('search', filter.search);
      if (filter.role) params.append('role', filter.role);
      url += '?' + params.toString();
    }
    return this.api.get<any>(url);
  }

  getUsersPage(filter?: UserFilter): Observable<{ items: User[]; total: number; page: number; limit: number }> {
    let url = 'users';
    if (filter) {
      const params = new URLSearchParams();
      if (filter.page) params.append('page', filter.page.toString());
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.search) params.append('search', filter.search);
      if (filter.role) params.append('role', filter.role);
      url += '?' + params.toString();
    }

    return this.api.get<any>(url).pipe(
      map(response => {
        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.items)
          ? response.items
          : [];

        return {
          items: items as User[],
          total: typeof response?.total === 'number' ? response.total : items.length,
          page: response?.page ?? filter?.page ?? 1,
          limit: response?.limit ?? filter?.limit ?? 10,
        };
      }),
    );
  }

  getUserById(id: string): Observable<User> {
    return this.api.get<User>(`users/${id}`);
  }

  createUser(user: User): Observable<User> {
    return this.api.post<User>('users', user);
  }

  updateUser(id: string, user: Partial<User>): Observable<User> {
    return this.api.put<User>(`users/${id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    return this.api.delete<void>(`users/${id}`);
  }

  setUsers(users: User[]) {
    this.usersSubject.next(users);
  }
}
